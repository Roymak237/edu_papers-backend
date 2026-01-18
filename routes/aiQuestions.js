const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getUserById, updateUser } = require('../db/db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// POST /api/ai/generate-questions - Generate questions for specific subject/course
router.post('/generate-questions',
  [
    body('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    body('courseId').optional().isInt().withMessage('Course ID must be an integer'),
    body('count').isInt({ min: 1, max: 50 }).withMessage('Count must be between 1 and 50'),
    body('difficulty').isIn(['easy', 'medium', 'hard', 'veryHard']).withMessage('Invalid difficulty level'),
    body('topics').optional().isArray().withMessage('Topics must be an array')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      // Ensure at least subjectId or courseId is provided
      if (!req.body.subjectId && !req.body.courseId) {
        return res.status(400).json({ error: 'Either subjectId or courseId must be provided' });
      }

      const { subjectId, courseId, count, difficulty, topics } = req.body;

      // In a real implementation, this would call an AI service
      // For now, we'll generate placeholder questions
      const generatedQuestions = [];
      for (let i = 0; i < count; i++) {
        generatedQuestions.push({
          question: `Generated question ${i + 1} for ${subjectId ? 'subject ' + subjectId : 'course ' + courseId}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Explanation for the correct answer',
          difficulty,
          topic: topics && topics.length > 0 ? topics[i % topics.length] : 'General',
          tags: ['AI-generated', difficulty],
          modelUsed: 'placeholder-model',
          confidenceScore: 0.85 + (Math.random() * 0.14).toFixed(2)
        });
      }

      // Store generated questions in database
      const conn = await require('../db/db').connection;
      const insertedQuestions = [];

      for (const question of generatedQuestions) {
        const [result] = await conn.query(
          `INSERT INTO ai_generated_questions 
           (subjectId, courseId, question, options, correctAnswer, explanation, difficulty, topic, tags, modelUsed, confidenceScore) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            subjectId,
            courseId,
            question.question,
            JSON.stringify(question.options),
            question.correctAnswer,
            question.explanation,
            question.difficulty,
            question.topic,
            JSON.stringify(question.tags),
            question.modelUsed,
            question.confidenceScore
          ]
        );

        insertedQuestions.push({
          id: result.insertId,
          ...question
        });
      }

      res.json({
        success: true,
        questions: insertedQuestions,
        count: insertedQuestions.length
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: 'Failed to generate questions' });
    }
  }
);

// GET /api/ai/questions/:subjectId - Retrieve AI-generated questions
router.get('/questions/:subjectId',
  param('subjectId').isInt().withMessage('Subject ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const conn = await require('../db/db').connection;
      const { approved } = req.query;

      let query = 'SELECT * FROM ai_generated_questions WHERE subjectId = ?';
      const params = [req.params.subjectId];

      if (approved !== undefined) {
        query += ' AND approved = ?';
        params.push(approved === 'true');
      }

      query += ' ORDER BY generatedAt DESC';

      const [rows] = await conn.query(query, params);

      const questions = rows.map(row => ({
        ...row,
        options: JSON.parse(row.options),
        tags: JSON.parse(row.tags || '[]')
      }));

      res.json(questions);
    } catch (error) {
      console.error('Error fetching AI questions:', error);
      res.status(500).json({ error: 'Failed to fetch AI questions' });
    }
  }
);

// GET /api/ai/questions/course/:courseId - Retrieve AI-generated questions by course
router.get('/questions/course/:courseId',
  param('courseId').isInt().withMessage('Course ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const conn = await require('../db/db').connection;
      const { approved } = req.query;

      let query = 'SELECT * FROM ai_generated_questions WHERE courseId = ?';
      const params = [req.params.courseId];

      if (approved !== undefined) {
        query += ' AND approved = ?';
        params.push(approved === 'true');
      }

      query += ' ORDER BY generatedAt DESC';

      const [rows] = await conn.query(query, params);

      const questions = rows.map(row => ({
        ...row,
        options: JSON.parse(row.options),
        tags: JSON.parse(row.tags || '[]')
      }));

      res.json(questions);
    } catch (error) {
      console.error('Error fetching AI questions by course:', error);
      res.status(500).json({ error: 'Failed to fetch AI questions by course' });
    }
  }
);

// POST /api/ai/approve-question - Approve AI-generated questions for use
router.post('/approve-question',
  [
    body('questionId').isInt().withMessage('Question ID must be an integer'),
    body('approvedBy').isInt().withMessage('Approved by must be an integer'),
    body('approved').isBoolean().withMessage('Approved must be a boolean')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { questionId, approvedBy, approved } = req.body;

      const conn = await require('../db/db').connection;

      // Check if user exists
      const user = await getUserById(approvedBy);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update question approval status
      const [result] = await conn.query(
        `UPDATE ai_generated_questions 
         SET approved = ?, approvedBy = ?, approvedAt = ? 
         WHERE id = ?`,
        [approved, approvedBy, new Date(), questionId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Fetch updated question
      const [rows] = await conn.query(
        'SELECT * FROM ai_generated_questions WHERE id = ?',
        [questionId]
      );

      const question = rows[0];
      res.json({
        success: true,
        question: {
          ...question,
          options: JSON.parse(question.options),
          tags: JSON.parse(question.tags || '[]')
        }
      });
    } catch (error) {
      console.error('Error approving question:', error);
      res.status(500).json({ error: 'Failed to approve question' });
    }
  }
);

// DELETE /api/ai/questions/:id - Delete an AI-generated question
router.delete('/questions/:id',
  param('id').isInt().withMessage('Question ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const conn = await require('../db/db').connection;

      const [result] = await conn.query(
        'DELETE FROM ai_generated_questions WHERE id = ?',
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Error deleting AI question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

module.exports = router;
