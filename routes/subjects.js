const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createCourse,
  getAllCourses,
  getCourseById,
  getCoursesBySubjectId,
  updateCourse,
  deleteCourse
} = require('../db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// Subject endpoints

// POST /api/subjects - Create a new subject
router.post('/',
  [
    body('name').notEmpty().withMessage('Subject name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('icon').optional().isString().withMessage('Icon must be a string')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subjectId = await createSubject(req.body);
      const subject = await getSubjectById(subjectId);
      res.status(201).json(subject);
    } catch (error) {
      console.error('Error creating subject:', error);
      res.status(500).json({ error: 'Failed to create subject' });
    }
  }
);

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await getAllSubjects();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id',
  param('id').isInt().withMessage('Subject ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subject = await getSubjectById(req.params.id);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }
      res.json(subject);
    } catch (error) {
      console.error('Error fetching subject:', error);
      res.status(500).json({ error: 'Failed to fetch subject' });
    }
  }
);

// PUT /api/subjects/:id - Update subject
router.put('/:id',
  [
    param('id').isInt().withMessage('Subject ID must be an integer'),
    body('name').optional().isString().withMessage('Name must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('icon').optional().isString().withMessage('Icon must be a string')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subject = await getSubjectById(req.params.id);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      await updateSubject(req.params.id, req.body);
      const updatedSubject = await getSubjectById(req.params.id);
      res.json(updatedSubject);
    } catch (error) {
      console.error('Error updating subject:', error);
      res.status(500).json({ error: 'Failed to update subject' });
    }
  }
);

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id',
  param('id').isInt().withMessage('Subject ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subject = await getSubjectById(req.params.id);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      await deleteSubject(req.params.id);
      res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
      console.error('Error deleting subject:', error);
      res.status(500).json({ error: 'Failed to delete subject' });
    }
  }
);

// Course endpoints

// POST /api/subjects/:subjectId/courses - Create a new course for a subject
router.post('/:subjectId/courses',
  [
    param('subjectId').isInt().withMessage('Subject ID must be an integer'),
    body('name').notEmpty().withMessage('Course name is required'),
    body('code').optional().isString().withMessage('Course code must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('level').optional().isString().withMessage('Level must be a string')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subject = await getSubjectById(req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      const courseData = {
        ...req.body,
        subjectId: req.params.subjectId
      };
      const courseId = await createCourse(courseData);
      const course = await getCourseById(courseId);
      res.status(201).json(course);
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
);

// GET /api/subjects/:subjectId/courses - Get all courses for a subject
router.get('/:subjectId/courses',
  param('subjectId').isInt().withMessage('Subject ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const subject = await getSubjectById(req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      const courses = await getCoursesBySubjectId(req.params.subjectId);
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  }
);

// GET /api/courses - Get all courses
router.get('/courses/all', async (req, res) => {
  try {
    const courses = await getAllCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:id - Get course by ID
router.get('/courses/:id',
  param('id').isInt().withMessage('Course ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const course = await getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.json(course);
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ error: 'Failed to fetch course' });
    }
  }
);

// PUT /api/courses/:id - Update course
router.put('/courses/:id',
  [
    param('id').isInt().withMessage('Course ID must be an integer'),
    body('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    body('name').optional().isString().withMessage('Name must be a string'),
    body('code').optional().isString().withMessage('Code must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('level').optional().isString().withMessage('Level must be a string')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const course = await getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await updateCourse(req.params.id, req.body);
      const updatedCourse = await getCourseById(req.params.id);
      res.json(updatedCourse);
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ error: 'Failed to update course' });
    }
  }
);

// DELETE /api/courses/:id - Delete course
router.delete('/courses/:id',
  param('id').isInt().withMessage('Course ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const course = await getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await deleteCourse(req.params.id);
      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Failed to delete course' });
    }
  }
);

module.exports = router;
