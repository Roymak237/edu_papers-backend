const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Key authentication for /api routes - commented out for development
// app.use('/api', (req, res, next) => {
//   const apiKey = req.headers['x-api-key'];
//   if (!apiKey || apiKey !== process.env.API_KEY) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   next();
// });

// Routes
const authRoutes = require('./routes/auth');
const papersRoutes = require('./routes/papers');
const aiRoutes = require('./routes/ai');
const aiQuestionsRoutes = require('./routes/aiQuestions');
const quizzesRoutes = require('./routes/quizzes');
const quizGeneratorRoutes = require('./routes/quizGenerator');
const usersRoutes = require('./routes/users');
const subjectsRoutes = require('./routes/subjects');
const offlineRoutes = require('./routes/offline');
const mediaRoutes = require('./routes/media');
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiQuestionsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/quiz-generator', quizGeneratorRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/sync', offlineRoutes);
app.use('/api/media', mediaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Edu Papers Backend API' });
});

// Placeholder routes for future implementation
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test', async (req, res) => {
  try {
    const connection = await db.connection;
    const [rows] = await connection.query('SELECT NOW() as server_time');
    res.json({ 
      status: "connected", 
      message: "Backend connected successfully", 
      server_time: rows[0].server_time,
      database: process.env.DB_NAME
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      status: "error", 
      error: 'Database connection failed',
      details: err.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
