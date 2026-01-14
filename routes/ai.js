const express = require('express');
const OpenAI = require('openai');
const { body, param, validationResult } = require('express-validator');
const { getAllPapers, createMessage, getAllMessages, deleteAllMessages, createAIFeedback, getAIFeedbackByMessageId, saveEvaluationQuestions, getEvaluationQuestions } = require('../db');

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// Initialize OpenAI only if API key is available
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.log('OpenAI initialization failed:', error.message);
}

// Helper function to find relevant papers for a query
async function findRelevantPapers(query) {
  const papers = await getAllPapers();
  const queryLower = query.toLowerCase();

  // Simple keyword matching - in production, use embeddings for better similarity
  return papers.filter(paper =>
    paper.title.toLowerCase().includes(queryLower) ||
    paper.subject.toLowerCase().includes(queryLower) ||
    paper.description.toLowerCase().includes(queryLower) ||
    (paper.tags && paper.tags.some(tag => tag.toLowerCase().includes(queryLower)))
  ).slice(0, 3); // Limit to top 3 relevant papers
}

// POST /api/ai/chat - Send message and get AI response
router.post('/chat', 
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const { content } = req.body;

    // Store user message in database
    await createMessage({
      content,
      isUser: true
    });

    // Find relevant papers for context
    const relevantPapers = await findRelevantPapers(content);

    // Build context from relevant papers
    let context = '';
    if (relevantPapers.length > 0) {
      context = '\n\nRelevant educational content:\n' +
        relevantPapers.map(paper =>
          `Title: ${paper.title}\nSubject: ${paper.subject}\nDescription: ${paper.description}\nTags: ${paper.tags.join(', ')}`
        ).join('\n\n');
    }

    // Create system prompt
    const systemPrompt = `You are an AI assistant for an educational papers platform. Help students with their studies by providing clear, accurate explanations.

Guidelines:
- Be helpful and encouraging
- Provide accurate information about educational topics
- Use the provided context when relevant
- If asked about specific papers or subjects, reference the available educational content
- Keep responses focused and not overly verbose
- If you don't have specific information about a topic, suggest looking at the available papers

${context ? `Context from papers:${context}` : 'No specific paper context available for this query.'}`;

    let aiContent;

    // For now, always use fallback since OpenAI quota is exceeded
    console.log('Using fallback response (OpenAI quota exceeded)');

    // Fallback response based on paper context
    if (relevantPapers.length > 0) {
      const paper = relevantPapers[0];
      aiContent = `Based on our educational papers database, here's what I found about "${content}":\n\n` +
        `📚 **${paper.title}**\n` +
        `📖 Subject: ${paper.subject}\n` +
        `📝 Description: ${paper.description}\n` +
        `🏷️ Tags: ${paper.tags.join(', ')}\n\n` +
        `This appears to be relevant content for your question. While I can't provide advanced AI analysis right now, ` +
        `I can help you find the most relevant papers from our collection. Would you like me to search for more papers on this topic?`;
    } else {
      aiContent = `I understand you're asking about "${content}". While I can't provide detailed AI responses right now, ` +
        `I can help you find relevant educational papers from our collection. Our database includes papers on Mathematics, Biology, and Chemistry. ` +
        `Try asking about specific subjects or topics from these areas, and I'll help you find the most relevant content!`;
    }

    // TODO: Uncomment this block when OpenAI billing is set up
    /*
    try {
      console.log('Attempting OpenAI API call...');
      // Get AI response from OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      aiContent = completion.choices[0].message.content;
      console.log('OpenAI API call successful');
    } catch (openaiError) {
      console.log('OpenAI API failed, using fallback response:', openaiError.message);
      console.log('OpenAI error code:', openaiError.code);

      // Fallback response based on paper context
      if (relevantPapers.length > 0) {
        const paper = relevantPapers[0];
        aiContent = `Based on our educational papers database, here's what I found about "${content}":\n\n` +
          `📚 **${paper.title}**\n` +
          `📖 Subject: ${paper.subject}\n` +
          `📝 Description: ${paper.description}\n` +
          `🏷️ Tags: ${paper.tags.join(', ')}\n\n` +
          `This appears to be relevant content for your question. While I can't provide advanced AI analysis right now, ` +
          `I can help you find the most relevant papers from our collection. Would you like me to search for more papers on this topic?`;
      } else {
        aiContent = `I understand you're asking about "${content}". While I can't provide detailed AI responses right now, ` +
          `I can help you find relevant educational papers from our collection. Our database includes papers on Mathematics, Biology, and Chemistry. ` +
          `Try asking about specific subjects or topics from these areas, and I'll help you find the most relevant content!`;
      }
    }
    */

    if (!aiContent) {
      throw new Error('Failed to generate AI response');
    }

    // Store AI response in database
    await createMessage({
      content: aiContent,
      isUser: false
    });

    // Get updated messages
    const messages = await getAllMessages();

    res.json({ messages });
  } catch (error) {
    console.error('AI Chat Error:', error);

    // If we get here, something went wrong with database operations
    // Try to provide a basic fallback response
    try {
      const basicResponse = `I apologize, but I'm having trouble processing your request right now. ` +
        `However, I can still help you find educational papers from our collection. ` +
        `We have papers on Mathematics, Biology, and Chemistry available. ` +
        `What subject are you interested in?`;

      await createMessage({
        content: basicResponse,
        isUser: false
      });

      const messages = await getAllMessages();
      return res.json({ messages });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return res.status(500).json({ error: 'Service temporarily unavailable' });
    }
  }
});

// GET /api/ai/messages - Get all messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// DELETE /api/ai/messages - Clear messages
router.delete('/messages', async (req, res) => {
  try {
    await deleteAllMessages();
    res.json({ message: 'Messages cleared' });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// POST /api/ai/feedback - Submit feedback for AI responses
router.post('/feedback',
  body('messageId')
    .notEmpty().withMessage('messageId is required')
    .isString().withMessage('messageId must be a string'),
  body('rating')
    .notEmpty().withMessage('rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('feedback')
    .optional()
    .isString().withMessage('feedback must be a string')
    .isLength({ max: 500 }).withMessage('feedback must not exceed 500 characters'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const { messageId, rating, feedback } = req.body;

    // Check if feedback already exists for this message
    const existingFeedback = await getAIFeedbackByMessageId(messageId);
    if (existingFeedback.length > 0) {
      return res.status(400).json({ error: 'Feedback already submitted for this message' });
    }

    // Create feedback entry
    await createAIFeedback({
      messageId,
      userId: req.body.userId, // Optional, for authenticated users
      rating,
      feedback: feedback || null
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/ai/feedback/:messageId - Get feedback for a specific message
router.get('/feedback/:messageId',
  param('messageId')
    .notEmpty().withMessage('messageId is required')
    .isString().withMessage('messageId must be a string'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const feedback = await getAIFeedbackByMessageId(req.params.messageId);
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// POST /api/ai/evaluation-questions - Store evaluation questions for a course paper
router.post('/evaluation-questions',
  body('paperId')
    .notEmpty().withMessage('paperId is required')
    .isString().withMessage('paperId must be a string'),
  body('questions')
    .notEmpty().withMessage('questions is required')
    .isArray().withMessage('questions must be an array')
    .isArray({ min: 1 }).withMessage('questions must contain at least one question'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const { paperId, questions } = req.body;

    // Store questions in the database (assuming a function saveEvaluationQuestions exists)
    await saveEvaluationQuestions(paperId, questions);

    res.json({ message: 'Evaluation questions stored successfully' });
  } catch (error) {
    console.error('Error storing evaluation questions:', error);
    res.status(500).json({ error: 'Failed to store evaluation questions' });
  }
});

// GET /api/ai/evaluation-questions/:paperId - Get evaluation questions for a course paper
router.get('/evaluation-questions/:paperId',
  param('paperId')
    .notEmpty().withMessage('paperId is required')
    .isString().withMessage('paperId must be a string'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const { paperId } = req.params;

    // Retrieve questions from the database (assuming a function getEvaluationQuestions exists)
    const questions = await getEvaluationQuestions(paperId);

    if (!questions) {
      return res.status(404).json({ error: 'No evaluation questions found for this paper' });
    }

    res.json(questions);
  } catch (error) {
    console.error('Error fetching evaluation questions:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation questions' });
  }
});

// POST /api/ai/evaluation-answers - Submit answers and get solutions
router.post('/evaluation-answers',
  body('paperId')
    .notEmpty().withMessage('paperId is required')
    .isString().withMessage('paperId must be a string'),
  body('answers')
    .notEmpty().withMessage('answers is required')
    .isArray().withMessage('answers must be an array')
    .isArray({ min: 1 }).withMessage('answers must contain at least one answer'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
      
      const { paperId, answers } = req.body;

    // Retrieve questions and solutions from the database
    const questions = await getEvaluationQuestions(paperId);

    if (!questions) {
      return res.status(404).json({ error: 'No evaluation questions found for this paper' });
    }

    // Compare answers and prepare solutions
    const results = questions.map((question, index) => ({
      question: question.text,
      correctAnswer: question.solution,
      userAnswer: answers[index] || null,
      isCorrect: answers[index] === question.solution
    }));

    res.json({ results });
  } catch (error) {
    console.error('Error evaluating answers:', error);
    res.status(500).json({ error: 'Failed to evaluate answers' });
  }
});

module.exports = router;
