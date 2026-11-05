// l = level (1-5), q = question text, c = code (optional), o = 4 answer options, a = index of the correct option (0 = first)
module.exports = [
  // LEVEL 1: SELECT and WHERE
  {
    l: 1,
    q: "Find the bug:",
    c: "SELECT * FORM dogs;",
    o: [
      "There is no WHERE",
      "FORM should be FROM",
      "The star is not allowed",
      "Table names must be uppercase",
    ],
    a: 1,
  },
  {
    l: 1,
    q: "What does this query do?",
    c: "SELECT name FROM cats\nWHERE color = 'black';",
    o: [
      "Fetches the names of all black cats",
      "Deletes all black cats",
      "Fetches every column for black cats",
      "Creates a new black cat",
    ],
    a: 0,
  },
  {
    l: 1,
    q: "What happens when someone runs this on a Friday afternoon?",
    c: "DELETE FROM customers;",
    o: [
      "Nothing, the WHERE is missing",
      "Only the first row is deleted",
      "Every row in customers is deleted",
      "The table customers is dropped completely",
    ],
    a: 2,
  },
  {
    l: 1,
    q: "What does this query return?",
    c: "SELECT 2 + 3 * 4;",
    o: ["20", "24", "14", "9"],
    a: 2,
  },

  // LEVEL 2: ORDER BY, LIMIT, DISTINCT, LIKE
  {
    l: 2,
    q: "The table fruit contains: apple, pear, apple, banana, pear. How many rows does this return?",
    c: "SELECT DISTINCT name FROM fruit;",
    o: ["5", "3", "2", "1"],
    a: 1,
  },
  {
    l: 2,
    q: "Which rows do you get?",
    c: "SELECT name FROM players\nORDER BY points DESC\nLIMIT 3;",
    o: [
      "The three with the lowest points",
      "The three with the highest points",
      "The first three alphabetically",
      "All players, sorted",
    ],
    a: 1,
  },
  {
    l: 2,
    q: "Find the bug:",
    c: "SELECT name FROM students\nLIMIT 5\nORDER BY grade;",
    o: [
      "LIMIT cannot be 5",
      "ORDER BY must come before LIMIT",
      "grade must be in quotes",
      "A GROUP BY is missing",
    ],
    a: 1,
  },
  {
    l: 2,
    q: "In PostgreSQL: which query finds all names starting with A or a?",
    o: [
      "WHERE name LIKE 'a%'",
      "WHERE name = 'a*'",
      "WHERE name ILIKE 'a%'",
      "WHERE name LIKE '%a'",
    ],
    a: 2,
  },

  // LEVEL 3: Aggregation and GROUP BY
  {
    l: 3,
    q: "What does this query give?",
    c: "SELECT customer, SUM(amount)\nFROM orders\nGROUP BY customer;",
    o: [
      "The biggest order",
      "The number of customers",
      "The total of all orders combined",
      "The total amount for each customer",
    ],
    a: 3,
  },
  {
    l: 3,
    q: "Column x holds the values 1, 2, NULL, 3. What does this return?",
    c: "SELECT COUNT(x) FROM t;",
    o: ["4", "3", "2", "NULL"],
    a: 1,
  },
  {
    l: 3,
    q: "Column x holds the values 10, 20 and NULL. What is the result?",
    c: "SELECT AVG(x) FROM t;",
    o: ["10", "30", "15", "NULL"],
    a: 2,
  },
  {
    l: 3,
    q: "You want only the customers whose total amount is over 1000. Which ending completes the query?",
    c: "SELECT customer, SUM(amount)\nFROM orders\n...",
    o: [
      "GROUP BY customer\nHAVING SUM(amount) > 1000;",
      "GROUP BY customer\nWHERE SUM(amount) > 1000;",
      "WHERE SUM(amount) > 1000\nGROUP BY customer;",
      "HAVING customer > 1000;",
    ],
    a: 0,
  },

  // LEVEL 4: JOIN
  {
    l: 4,
    q: "Find the bug:",
    c: "SELECT name\nFROM customers\nJOIN orders;",
    o: [
      "JOIN is missing an ON condition",
      "name must be written in uppercase",
      "JOIN must be written INNER JOIN",
      "You cannot join two tables",
    ],
    a: 0,
  },
  {
    l: 4,
    q: "customers: (1, Anna), (2, Bo). orders: two rows, both with customer_id = 1. What is returned?",
    c: "SELECT c.name\nFROM customers c\nJOIN orders o ON o.customer_id = c.id;",
    o: ["1 row: Anna", "2 rows: Anna, Anna", "2 rows: Anna, Bo", "3 rows"],
    a: 1,
  },
  {
    l: 4,
    q: "Same tables, but with LEFT JOIN. What happens to Bo, who has no orders?",
    c: "SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;",
    o: [
      "Bo disappears from the result",
      "The query fails",
      "Bo is included, o.id is NULL",
      "Bo is included, o.id is 0",
    ],
    a: 2,
  },
  {
    l: 4,
    q: "Which query finds customers who have never placed an order?",
    o: [
      "... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id = NULL",
      "... INNER JOIN orders o ON o.customer_id = c.id",
      "... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NOT NULL",
      "... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL",
    ],
    a: 3,
  },

  // LEVEL 5: Subqueries, CASE, NULL, PostgreSQL specials
  {
    l: 5,
    q: "What grade does the student with exactly 90 points get?",
    c: "SELECT CASE\n  WHEN points >= 90 THEN 'A'\n  WHEN points >= 50 THEN 'B'\n  ELSE 'C'\nEND\nFROM exams;",
    o: ["'B'", "'A'", "'C'", "Both 'A' and 'B'"],
    a: 1,
  },
  {
    l: 5,
    q: "Who does this query find?",
    c: "SELECT name FROM people\nWHERE age = (\n  SELECT MAX(age) FROM people\n);",
    o: [
      "The youngest person",
      "The oldest person (or people)",
      "Everyone",
      "The person with the longest name",
    ],
    a: 1,
  },
  {
    l: 5,
    q: "What is the result in PostgreSQL? Mind the data types!",
    c: "SELECT 10 / 4 * 2.0;",
    o: ["5.0", "4.0", "4", "5"],
    a: 1,
  },
  {
    l: 5,
    q: "Column x holds the values 1, 2, 3 and NULL. How many rows does this return?",
    c: "SELECT COUNT(*) FROM t\nWHERE x <> 2;",
    o: ["3", "2", "4", "1"],
    a: 1,
  },
];
