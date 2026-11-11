# Sundsgården SQL Grand Prix

A multiplayer SQL quiz in 80s arcade style. Up to 50 players race against each other at the same time. Answer right, and your car drives further.

**Try it:** https://derby-07v1.onrender.com/

**Host (starts the race):** https://derby-07v1.onrender.com/?admin=YOUR_PASSWORD
Add the host password after `?admin=`. Only the host sees the **START THE RACE** button.

> The free server at Render.com sleeps when idle. Open the page a few minutes before the race so it can wake up (it can take about a minute).

## How it works

1. Players open the link, enter a name (no login) and wait in the lobby.
2. The host starts the race. The server then runs everything on its own, so the host can close the page.
3. Everyone gets the same question at the same time. The question ends when all players have answered, or when time runs out (45 to 90 seconds, depending on level).
4. After each question the correct answer is shown, together with the top 5 and your own position.
5. After the last question, the final standings are shown.

25 questions, 5 per level, PostgreSQL flavour:

| Level | Topic                                       |
| ----- | ------------------------------------------- |
| 1     | SELECT, WHERE                               |
| 2     | ORDER BY, LIMIT, DISTINCT, LIKE/ILIKE       |
| 3     | Aggregates, GROUP BY, HAVING                |
| 4     | JOINs                                       |
| 5     | Subqueries, CASE, NULL, PostgreSQL specials |

## Scoring

A correct answer gives:

- **Base points:** 100 × level (100 on level 1, up to 500 on level 5)
- **Speed bonus:** 0 to 50 points, based on how much time was left
- **Boost bonus:** +50 for each correct answer after 3 in a row

A wrong answer or no answer gives 0 points and resets your streak.

## Pit Stop

After every 3rd question (not after the last one) the game takes a pit stop. The names of all players roll past, slow down, and one random player is picked. Everyone gets the same show: a 3-2-1 countdown, then the event is revealed for a few seconds, and then the cars move to their new places (a car can go backwards). Nobody is picked twice until everyone has been picked.

| Event | Effect |
| ----- | ------ |
| PERFECT PIT STOP | +50 x level points |
| POLE POSITION | +100 x level points |
| UNDERCUT | steals up to 50 x level points from the player just ahead |
| DOUBLE POINTS | the points from the last answer count twice |
| PUNCTURE | -50 x level points |
| ENGINE FAILURE | -100 x level points |
| 5-SECOND PENALTY | -25 x level points and the streak is lost |
| TRACK LIMITS | the points from the last answer are cancelled and the streak is lost |

About 60 % of the events are good ones. Points never go below 0.

## Good to know

- Scores are kept in server memory only. If the server restarts, the game starts over.
- Reloading the page is fine: you rejoin with your score intact.
- Each browser counts as one player, so use separate browsers or devices to test.

## Run locally

```
node server.js
```

Then open http://localhost:3000 (host: http://localhost:3000/?admin=derby). Set the `ADMIN_KEY` environment variable to change the host password.

Questions live in `questions.js`.
