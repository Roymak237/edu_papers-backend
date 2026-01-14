const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const {
  createQuiz,
  getQuizById,
  getQuizzesBySubject,
  getQuizzesByCourse,
  getQuizzesByDifficulty,
  getAllQuizzes,
  createQuizQuestion,
  getQuestionsByQuizId,
  getQuestionsByDifficulty,
  createQuizAttempt,
  getQuizAttemptsByUserId,
  getQuizAttemptsByQuizId,
  getUserById,
  updateUser,
  getAllUserLevels,
  updateUserLevel,
  createPaper,
  updatePaper,
  getPaperById
} = require('../db/db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// POST /api/quizzes - Create a new quiz
router.post('/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('difficultyLevel').isIn(['easy', 'medium', 'hard', 'veryHard']).withMessage('Invalid difficulty level'),
    body('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    body('courseId').optional().isInt().withMessage('Course ID must be an integer'),
    body('createdBy').optional().isInt().withMessage('Created by must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      // Ensure at least subjectId or courseId is provided
      if (!req.body.subjectId && !req.body.courseId) {
        return res.status(400).json({ error: 'Either subjectId or courseId must be provided' });
      }

      const quizId = await createQuiz(req.body);
      const quiz = await getQuizById(quizId);
      res.status(201).json(quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({ error: 'Failed to create quiz' });
    }
  }
);

// GET /api/quizzes - Get all quizzes
router.get('/', async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    let quizzes;

    if (subject) {
      quizzes = await getQuizzesBySubject(subject);
    } else if (difficulty) {
      quizzes = await getQuizzesByDifficulty(difficulty);
    } else {
      quizzes = await getAllQuizzes();
    }

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// GET /api/quizzes/course/:courseId - Get quizzes by course
router.get('/course/:courseId',
  param('courseId').isInt().withMessage('Course ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quizzes = await getQuizzesByCourse(req.params.courseId);
      res.json(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes by course:', error);
      res.status(500).json({ error: 'Failed to fetch quizzes by course' });
    }
  }
);

// GET /api/quizzes/:id - Get quiz by ID
router.get('/:id',
  param('id').isInt().withMessage('Quiz ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quiz = await getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      const questions = await getQuestionsByQuizId(quiz.id);
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error('Error fetching quiz:', error);
      res.status(500).json({ error: 'Failed to fetch quiz' });
    }
  }
);

// PUT /api/quizzes/:id - Update quiz details
router.put('/:id',
  [
    param('id').isInt().withMessage('Quiz ID must be an integer'),
    body('title').optional().isString().withMessage('Title must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('difficultyLevel').optional().isIn(['easy', 'medium', 'hard', 'veryHard']).withMessage('Invalid difficulty level'),
    body('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    body('courseId').optional().isInt().withMessage('Course ID must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quiz = await getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      // Build update object with only provided fields
      const updateData = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.difficultyLevel !== undefined) updateData.difficultyLevel = req.body.difficultyLevel;
      if (req.body.subjectId !== undefined) updateData.subjectId = req.body.subjectId;
      if (req.body.courseId !== undefined) updateData.courseId = req.body.courseId;

      // Update quiz in database
      const conn = await require('../db/db').connection;
      const fields = Object.keys(updateData).map(key => `${key} = ?`);
      const values = Object.values(updateData);
      values.push(req.params.id);

      await conn.query(`UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`, values);

      const updatedQuiz = await getQuizById(req.params.id);
      res.json(updatedQuiz);
    } catch (error) {
      console.error('Error updating quiz:', error);
      res.status(500).json({ error: 'Failed to update quiz' });
    }
  }
);

// POST /api/quizzes/:id/questions - Add questions to a quiz
router.post('/:id/questions',
  [
    param('id').isInt().withMessage('Quiz ID must be an integer'),
    body('questions').isArray().withMessage('Questions must be an array')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quiz = await getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      const { questions } = req.body;
      for (const question of questions) {
        await createQuizQuestion({
          quizId: quiz.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          topic: question.topic,
          tags: question.tags
        });
      }

      const updatedQuestions = await getQuestionsByQuizId(quiz.id);
      res.status(201).json(updatedQuestions);
    } catch (error) {
      console.error('Error adding questions:', error);
      res.status(500).json({ error: 'Failed to add questions' });
    }
  }
);

// GET /api/quizzes/:id/questions - Get questions for a quiz
router.get('/:id/questions',
  param('id').isInt().withMessage('Quiz ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quiz = await getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      const { difficulty } = req.query;
      let questions;

      if (difficulty) {
        questions = await getQuestionsByDifficulty(quiz.id, difficulty);
      } else {
        questions = await getQuestionsByQuizId(quiz.id);
      }

      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }
);

// POST /api/quizzes/:id/attempt - Submit a quiz attempt
router.post('/:id/attempt',
  [
    param('id').isInt().withMessage('Quiz ID must be an integer'),
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('answers').isArray().withMessage('Answers must be an array')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const quiz = await getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      const questions = await getQuestionsByQuizId(quiz.id);
      const { userId, answers } = req.body;

      // Calculate score
      let correctCount = 0;
      const results = questions.map((question, index) => {
        const isCorrect = answers[index] === question.correctAnswer;
        if (isCorrect) correctCount++;
        return {
          questionId: question.id,
          question: question.question,
          userAnswer: answers[index],
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation
        };
      });

      // Create quiz attempt
      await createQuizAttempt({
        userId,
        quizId: quiz.id,
        score: correctCount,
        totalQuestions: questions.length,
        answers
      });

      res.json({
        score: correctCount,
        totalQuestions: questions.length,
        results
      });
    } catch (error) {
      console.error('Error submitting attempt:', error);
      res.status(500).json({ error: 'Failed to submit attempt' });
    }
  }
);

// POST /api/quizzes/:id/attempt/submit - Submit and confirm quiz attempt (for XP rewards)
router.post('/:id/attempt/submit',
  [
    param('id').isInt().withMessage('Quiz ID must be an integer'),
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('score').isInt().withMessage('Score must be an integer'),
    body('totalQuestions').isInt().withMessage('Total questions must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId, score, totalQuestions } = req.body;
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Award XP for completing the quiz only if not admin
      let xpEarned = 0;
      let newXP = user.currentXP;
      if (!user.isAdmin) {
        xpEarned = score * 10; // 10 XP per correct answer
        newXP = user.currentXP + xpEarned;
      }

      // Get all user levels to check for level up
      const levels = await getAllUserLevels();
      let newLevel = user.level;

      // Check if user should level up
      for (const level of levels) {
        if (level.level > user.level && newXP >= level.requiredXP) {
          newLevel = level.level;
          // Award badge
          const badges = user.badges || [];
          if (!badges.find(b => b.name === level.badgeName)) {
            badges.push({
              name: level.badgeName,
              icon: level.badgeIcon,
              description: level.badgeDescription,
              earnedAt: new Date()
            });
          }

          await updateUser(userId, {
            badges,
            level: newLevel,
            currentXP: newXP
          });

          return res.json({
            message: 'Quiz submitted successfully',
            xpEarned,
            newXP,
            levelUp: true,
            newLevel,
            badge: level.badgeName
          });
        }
      }

      // No level up, just update XP
      await updateUser(userId, { currentXP: newXP });

      res.json({
        message: 'Quiz submitted successfully',
        xpEarned,
        newXP,
        levelUp: false,
        currentLevel: newLevel
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ error: 'Failed to submit quiz' });
    }
  }
);

// GET /api/quizzes/user/:userId/attempts - Get all quiz attempts for a user
router.get('/user/:userId/attempts',
  param('userId').isInt().withMessage('User ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const attempts = await getQuizAttemptsByUserId(req.params.userId);
      res.json(attempts);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      res.status(500).json({ error: 'Failed to fetch attempts' });
    }
  }
);

// POST /api/quizzes/paper/:paperId/approve - Approve a paper and award XP
router.post('/paper/:paperId/approve',
  [
    param('paperId').isInt().withMessage('Paper ID must be an integer'),
    body('adminId').isInt().withMessage('Admin ID must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { adminId } = req.body;
      const admin = await getUserById(adminId);

      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Only admins can approve papers' });
      }

      const paper = await getPaperById(req.params.paperId);
      if (!paper) {
        return res.status(404).json({ error: 'Paper not found' });
      }

      // Update paper status to approved
      await updatePaper(req.params.paperId, { status: 'approved' });

      // Award 100 XP to the uploader only if not admin
      const uploader = await getUserById(paper.uploaderId);
      if (uploader && !uploader.isAdmin) {
        const xpEarned = 100;
        const newXP = uploader.currentXP + xpEarned;

        // Get all user levels to check for level up
        const levels = await getAllUserLevels();
        let newLevel = uploader.level;
        let badgeAwarded = null;

        // Check if user should level up
        for (const level of levels) {
          if (level.level > uploader.level && newXP >= level.requiredXP) {
            newLevel = level.level;
            // Award badge
            const badges = uploader.badges || [];
            if (!badges.find(b => b.name === level.badgeName)) {
              badges.push({
                name: level.badgeName,
                icon: level.badgeIcon,
                description: level.badgeDescription,
                earnedAt: new Date()
              });
              badgeAwarded = level.badgeName;
            }
          }
        }

        await updateUser(paper.uploaderId, {
          currentXP: newXP,
          level: newLevel,
          badges: uploader.badges
        });

        res.json({
          message: 'Paper approved successfully',
          xpEarned,
          newXP,
          newLevel,
          badgeAwarded
        });
      } else {
        res.json({ message: 'Paper approved successfully' });
      }
    } catch (error) {
      console.error('Error approving paper:', error);
      res.status(500).json({ error: 'Failed to approve paper' });
    }
  }
);

module.exports = router;
