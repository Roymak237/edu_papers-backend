const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const {
  getAllPapers,
  getPaperById,
  createPaper,
  updatePaper,
  getPapersByUserId,
  getPendingPapers,
  updateUser,
  getUserById,
  getAllUserLevels
} = require('../db/db');

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

router.use(limiter);

// GET /api/papers - Get all papers with pagination and filtering (role-based access)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, subject, tags, userId } = req.query;
    let papers = await getAllPapers();

    // Get user role for filtering
    let isAdmin = false;
    if (userId) {
      const user = await getUserById(userId);
      isAdmin = user && user.isAdmin;
    }

    // Filter papers based on user role
    if (!isAdmin) {
      // Students only see approved papers
      papers = papers.filter(paper => paper.status === 'approved');
    }
    // Admins see all papers (no filtering by status)

    // Search by title or description
    if (search) {
      const searchLower = search.toLowerCase();
      papers = papers.filter(paper =>
        paper.title.toLowerCase().includes(searchLower) ||
        (paper.description && paper.description.toLowerCase().includes(searchLower))
      );
    }

    // Filter by subject
    if (subject) {
      papers = papers.filter(paper => paper.subject.toLowerCase() === subject.toLowerCase());
    }

    // Filter by tags
    if (tags) {
      const tagsArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      papers = papers.filter(paper =>
        paper.tags && paper.tags.some(tag => tagsArray.includes(tag.toLowerCase()))
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPapers = papers.slice(startIndex, endIndex);

    res.json({
      total: papers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: paginatedPapers
    });
  } catch (error) {
    console.error('Error fetching papers:', error);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

// GET /api/papers/:id - Get paper by ID
router.get('/:id',
  param('id')
    .notEmpty().withMessage('Paper ID is required')
    .isInt().withMessage('Paper ID must be an integer'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const paper = await getPaperById(req.params.id);
      if (paper) {
        res.json(paper);
      } else {
        res.status(404).json({ message: 'Paper not found' });
      }
    } catch (error) {
      console.error('Error fetching paper:', error);
      res.status(500).json({ error: 'Failed to fetch paper' });
    }
  });

// POST /api/papers - Upload new paper with validation
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('level').notEmpty().withMessage('Level is required'),
    body('year').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Year must be a valid number'),
    body('uploaderId').isInt().withMessage('Uploader ID must be an integer'),
    body('contentType').notEmpty().withMessage('Content type is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if uploader is admin
      const uploader = await getUserById(req.body.uploaderId);
      const isAdmin = uploader && uploader.isAdmin;

      const paperData = {
        ...req.body,
        uploadDate: new Date(),
        downloadCount: 0,
        status: isAdmin ? 'approved' : 'pending' // Auto-approve if admin
      };

      const paperId = await createPaper(paperData);
      const paper = await getPaperById(paperId);

      res.status(201).json(paper);
    } catch (error) {
      console.error('Error creating paper:', error);
      res.status(500).json({ error: 'Failed to create paper' });
    }
  }
);

// PUT /api/papers/:id/status - Update paper status with validation
router.put(
  '/:id/status',
  [
    param('id').isInt().withMessage('Paper ID must be an integer'),
    body('status').isIn(['approved', 'pending', 'rejected']).withMessage('Status must be approved, pending, or rejected'),
    body('rejectionReason').optional().isString().withMessage('Rejection reason must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, rejectionReason } = req.body;
      const paperId = req.params.id;

      const paper = await getPaperById(paperId);
      if (!paper) {
        return res.status(404).json({ message: 'Paper not found' });
      }

      await updatePaper(paperId, { status, rejectionReason });
      const updatedPaper = await getPaperById(paperId);

      res.json(updatedPaper);
    } catch (error) {
      console.error('Error updating paper status:', error);
      res.status(500).json({ error: 'Failed to update paper status' });
    }
  }
);

// GET /api/papers/uploaded/:userId - Get papers uploaded by user
router.get('/uploaded/:userId',
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userPapers = await getPapersByUserId(req.params.userId);
      res.json(userPapers);
    } catch (error) {
      console.error('Error fetching user papers:', error);
      res.status(500).json({ error: 'Failed to fetch user papers' });
    }
  });

// GET /api/papers/pending - Get pending papers (admin)
router.get('/admin/pending', async (req, res) => {
  try {
    const pendingPapers = await getPendingPapers();
    res.json(pendingPapers);
  } catch (error) {
    console.error('Error fetching pending papers:', error);
    res.status(500).json({ error: 'Failed to fetch pending papers' });
  }
});

// GET /api/papers/:id/content - Get paper content by ID
router.get('/:id/content',
  param('id')
    .notEmpty().withMessage('Paper ID is required')
    .isString().withMessage('Paper ID must be a string'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
    const paperId = req.params.id;
    const db = require('../db/db'); // Import database functions

    // Fetch paper by ID
    const paper = await db.getPaperById(paperId);

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Check if paper is approved
    if (paper.status !== 'approved') {
      return res.status(403).json({
        message: 'Paper is not yet approved',
        status: paper.status,
        rejectionReason: paper.rejectionReason
      });
    }

    // Assuming the paper content is stored in a file or database, retrieve it here
    // For now, we will simulate content retrieval
    const content = `Content of the paper titled "${paper.title}".`; // Replace with actual content retrieval logic

    res.json({
      id: paper.id,
      title: paper.title,
      content,
    });
  } catch (error) {
    console.error('Error fetching paper content:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;