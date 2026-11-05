// Sundsgården SQL Derby - game server. No external packages needed.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const Q = require('./questions.js');

const PORT = process.env.PORT || 3000;
const ADMIN = process.env.ADMIN_KEY || 'derby';
const MAX_PLAYERS = 50, REVEAL_MS = 12000;
const TIMES = [0, 45, 60, 75, 90, 90]; // sekunder per nivå
const MAXSCORE = Q.reduce((s, q) => s + 100 * q.l + 100, 0);
const html = fs.readFileSync(path.join(__dirname, 'index.html'));

function serveMp3(req, res, file) {
  const MP3 = path.join(__dirname, file);
  fs.stat(MP3, (err, st) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const size = st.size;
    const h = { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' };
    const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (r && (r[1] || r[2])) {
      let start = r[1] ? parseInt(r[1], 10) : Math.max(0, size - parseInt(r[2], 10));
      let end = r[1] && r[2] ? Math.min(parseInt(r[2], 10), size - 1) : size - 1;
      if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); res.end(); return; }
      res.writeHead(206, Object.assign(h, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1 }));
      fs.createReadStream(MP3, { start, end }).pipe(res);
    } else {
      res.writeHead(200, Object.assign(h, { 'Content-Length': size }));
      fs.createReadStream(MP3).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/intro.mp3' || url === '/horses.mp3') { serveMp3(req, res, url.slice(1)); return; }
  if (req.url === '/health') { res.end('ok'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

// ---------- WebSocket (RFC 6455, textmeddelanden) ----------
const clients = new Set();

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  const c = { socket, buf: Buffer.alloc(0), player: null, admin: false };
  clients.add(c);
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); parse(c); });
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
});

function send(c, obj) {
  if (!c || c.socket.destroyed) return;
  const p = Buffer.from(JSON.stringify(obj));
  let h;
  if (p.length < 126) h = Buffer.from([0x81, p.length]);
  else { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  try { c.socket.write(Buffer.concat([h, p])); } catch (e) {}
}

function parse(c) {
  while (c.buf.length >= 2) {
    const b = c.buf, op = b[0] & 15, masked = (b[1] & 128) !== 0;
    let len = b[1] & 127, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { c.socket.destroy(); return; }
    const end = off + (masked ? 4 : 0) + len;
    if (b.length < end) return;
    let payload = b.slice(off + (masked ? 4 : 0), end);
    if (masked) { const m = b.slice(off, off + 4); payload = Buffer.from(payload.map((x, i) => x ^ m[i % 4])); }
    c.buf = b.slice(end);
    if (op === 8) { c.socket.end(); return; }
    if (op === 9 && payload.length < 126) { c.socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
    if (op === 1) { try { handle(c, JSON.parse(payload.toString())); } catch (e) {} }
  }
}

setInterval(() => clients.forEach(c => { try { c.socket.write(Buffer.from([0x89, 0])); } catch (e) {} }), 20000);

// ---------- Spel ----------
const players = new Map(); // token -> spelare
let phase = 'lobby', qi = -1, cur = null, timer = null, revealTimer = null, paused = false;

const live = () => [...players.values()].filter(p => p.c);
const answered = () => live().filter(p => p.ans !== null).length;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function handle(c, m) {
  if (m.t === 'hi') {
    let p = m.token && players.get(m.token);
    if (!p) {
      if (live().length >= MAX_PLAYERS) { send(c, { t: 'full' }); return; }
      const name = String(m.name || '').trim().slice(0, 16) || 'Player';
      p = { token: crypto.randomBytes(8).toString('hex'), name, score: 0, streak: 0, pos: 0, ans: null, t: 0, delta: 0, ok: false, c: null };
      players.set(p.token, p);
    }
    p.c = c; c.player = p; c.admin = m.admin === ADMIN;
    send(c, { t: 'hello', token: p.token, name: p.name, admin: c.admin });
    if (phase === 'question') sendQ(c, p);
    else if (phase === 'end') send(c, endMsg(p));
    else if (phase === 'reveal') send(c, revealMsg(p));
    else send(c, { t: 'wait', phase, n: live().length });
    pulse();
  } else if (m.t === 'start' && c.admin && phase === 'lobby') {
    nextQ();
  } else if (m.t === 'reset' && c.admin) {
    reset();
  } else if (m.t === 'pause' && c.admin && phase === 'reveal' && !paused) {
    paused = true; clearTimeout(revealTimer);
    live().forEach(p => send(p.c, { t: 'pause', on: true }));
  } else if (m.t === 'resume' && c.admin && phase === 'reveal' && paused) {
    live().forEach(p => send(p.c, { t: 'pause', on: false }));
    nextQ();
  } else if (m.t === 'a' && phase === 'question' && c.player && c.player.ans === null && m.i === qi) {
    const k = m.c | 0;
    if (k < 0 || k > 3) return;
    c.player.ans = k; c.player.t = Date.now();
    send(c, { t: 'ack' });
    pulse();
    if (live().every(p => p.ans !== null)) reveal();
  }
}

function reset() {
  clearTimeout(timer); clearTimeout(revealTimer); paused = false;
  phase = 'lobby'; qi = -1; cur = null;
  players.forEach((p, k) => {
    if (!p.c) { players.delete(k); return; }
    p.score = 0; p.streak = 0; p.pos = 0; p.ans = null; p.t = 0; p.delta = 0; p.ok = false;
  });
  live().forEach(p => send(p.c, { t: 'reset' }));
  pulse();
}

function drop(c) {
  clients.delete(c);
  if (c.player && c.player.c === c) {
    c.player.c = null;
    pulse();
    if (phase === 'question' && live().length > 0 && live().every(p => p.ans !== null)) reveal();
  }
}

function pulse() {
  const n = live().length;
  live().forEach(p => {
    if (phase === 'lobby') send(p.c, { t: 'wait', phase, n });
    else if (phase === 'question') send(p.c, { t: 'prog', done: answered(), of: n });
  });
}

function sendQ(c, p) {
  const q = Q[qi];
  send(c, { t: 'q', i: qi, n: Q.length, l: q.l, q: q.q, code: q.c || '', o: cur.opts,
    left: cur.dur - (Date.now() - cur.start), dur: cur.dur, answered: p.ans !== null, done: answered(), of: live().length });
}

function nextQ() {
  paused = false;
  qi++;
  if (qi >= Q.length) { phase = 'end'; live().forEach(p => send(p.c, endMsg(p))); return; }
  const q = Q[qi], order = shuffle([0, 1, 2, 3]), dur = TIMES[q.l] * 1000;
  cur = { opts: order.map(i => q.o[i]), correct: order.indexOf(q.a), start: Date.now(), dur };
  players.forEach(p => { p.ans = null; p.ok = false; p.delta = 0; });
  phase = 'question';
  live().forEach(p => sendQ(p.c, p));
  timer = setTimeout(reveal, dur);
}

// share of the track the leader has earned: questions finished, weighted by level
function progress() {
  let s = 0;
  for (let i = 0; i <= Math.min(qi, Q.length - 1); i++) s += 100 * Q[i].l + 100;
  return s / MAXSCORE;
}

function board(p) {
  const ranked = [...players.values()].sort((a, b) => b.score - a.score);
  return {
    top: ranked.slice(0, 5).map(x => ({ name: x.name, score: x.score, pos: x.pos, you: x === p })),
    me: { rank: ranked.indexOf(p) + 1, score: p.score, pos: p.pos, delta: p.delta, ok: p.ok, streak: p.streak, answered: p.ans !== null },
    total: ranked.length, max: MAXSCORE, prog: progress()
  };
}

function revealMsg(p) {
  const q = Q[qi];
  return Object.assign({ t: 'r', correct: cur.correct, right: cur.opts[cur.correct], last: qi === Q.length - 1, e: q.e || '', paused }, board(p));
}

function endMsg(p) { return Object.assign({ t: 'end' }, board(p)); }

function reveal() {
  if (phase !== 'question') return;
  clearTimeout(timer);
  phase = 'reveal';
  const q = Q[qi];
  players.forEach(p => {
    p.ok = p.ans === cur.correct;
    if (p.ok) {
      p.streak++;
      const frac = Math.max(0, (cur.start + cur.dur - p.t) / cur.dur);
      p.delta = 100 * q.l + Math.round(50 * frac) + (p.streak >= 3 ? 50 : 0);
      p.score += p.delta;
    } else p.streak = 0;
  });
  // Horse position (display only): moves only after a correct answer, never goes back, and no horse
  // can pass the leading horse. A horse only gets in front by taking the lead on points.
  const lead = Math.max(0, ...[...players.values()].map(x => x.score)), P = progress();
  const leaders = lead > 0 ? [...players.values()].filter(x => x.score === lead) : [];
  leaders.forEach(p => { if (p.ok) p.pos = Math.max(p.pos || 0, P); });
  const L = leaders.length ? Math.max(...leaders.map(x => x.pos || 0)) : 0;
  players.forEach(p => {
    if (!p.ok || p.score === lead) return;
    const target = P * Math.pow(p.score / lead, 0.7);
    p.pos = Math.max(p.pos || 0, Math.min(target, L));
  });
  live().forEach(p => send(p.c, revealMsg(p)));
  revealTimer = setTimeout(nextQ, REVEAL_MS);
}

server.listen(PORT, () => console.log('Sundsgården SQL Derby running on port ' + PORT));
