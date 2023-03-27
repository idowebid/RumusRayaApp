const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const { solveMathProblem } = require('./openai');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Welcome to RumusRayaApp!');
});

app.post('/solve', enforceDailyLimit, async (req, res) => {
  const problem = req.body.problem;
  const sanitizedProblem = problem.replace(/[^0-9+\-*/\s().,]/g, '');

  const result = await solveMathProblem(sanitizedProblem);

  const category = req.body.category || 'Unknown';
  const insertQuery = `
    INSERT INTO questions (question, category)
    VALUES ($1, $2)
    RETURNING id
  `;

  try {
    const dbResult = await db.query(insertQuery, [sanitizedProblem, category]);
    const questionId = dbResult.rows[0].id;

    res.json({
      success: true,
      id: questionId,
      problem: sanitizedProblem,
      result: result,
    });
  } catch (error) {
    console.error('Error saving to database:', error);
    res.status(500).json({ success: false, message: 'Error saving to database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

db.query(createTableQuery)
  .then(() => {
    console.log('Table created successfully');
  })
  .catch((err) => {
    console.error('Error creating table:', err);
  });

function authenticateAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.get('Admin-Password');

  if (providedPassword === adminPassword) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

app.post('/admin/change-api-key', authenticateAdmin, (req, res) => {
  const newApiKey = req.body.apiKey;
  if (newApiKey) {
    openai.apiKey = newApiKey;
    res.json({ success: true, message: 'API key updated' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid API key' });
  }
});

const dailyLimit = 100; // Set your desired daily limit

async function enforceDailyLimit(req, res, next) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const countQuery = `
    SELECT COUNT(*) FROM questions
    WHERE created_at >= $1
  `;

  try {
    const countResult = await db.query(countQuery, [date]);
    const count = parseInt(countResult.rows[0].count);

    if (count < dailyLimit) {
      next();
    } else {
      res.status(429).json({ success: false, message: 'Daily limit reached' });
    }
  } catch (error) {
    console.error('Error enforcing daily limit:', error);
    res.status(500).json({ success: false, message: 'Error enforcing daily limit' });
  }
}
