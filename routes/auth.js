const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
const { createUser, getUserById, getUserByUsernameOrEmail, getAllUsers, updateUser, logLoginAttempt, logAccountCreation } = require('../db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// POST /api/auth/login
router.post('/login',
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username')
    .optional({ nullable: true })
    .if(body('username').exists())
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .optional({ nullable: true })
    .if(body('email').exists())
    .isEmail().withMessage('Email must be a valid email address'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
    const { username, email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Input validation is now handled by express-validator middleware
    
    let user;
    const identifier = username || email;
    
    try {
      if (username) {
        user = await getUserByUsernameOrEmail(username, null);
      } else if (email) {
        user = await getUserByUsernameOrEmail(null, email);
      }
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
      // Log failed login attempt (non-blocking)
      logLoginAttempt({
        user_id: null,
        username_or_email: identifier,
        success: false,
        ip_address: ip
      }).catch(err => console.error('Failed to log login attempt:', err));
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!user) {
      await logLoginAttempt({
        user_id: null,
        username_or_email: identifier,
        success: false,
        ip_address: ip
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Ensure password field exists
    if (!user.password) {
      console.error('User found but missing password field:', user);
      await logLoginAttempt({
        user_id: user.id,
        username_or_email: identifier,
        success: false,
        ip_address: ip
      });
      return res.status(500).json({ success: false, message: 'User data error' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      const { password: _, ...userWithoutPassword } = user;
      
      // Log successful login (non-blocking)
      logLoginAttempt({
        user_id: user.id,
        username_or_email: identifier,
        success: true,
        ip_address: ip
      }).catch(err => console.error('Failed to log login attempt:', err));
      
      res.json({ success: true, user: userWithoutPassword });
    } else {
      // Log failed login attempt (non-blocking)
      logLoginAttempt({
        user_id: user.id,
        username_or_email: identifier,
        success: false,
        ip_address: ip
      }).catch(err => console.error('Failed to log login attempt:', err));
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    const identifier = req.body.username || req.body.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log failed login attempt (non-blocking)
    logLoginAttempt({
      user_id: null,
      username_or_email: identifier,
      success: false,
      ip_address: ip
    }).catch(logError => console.error('Failed to log login attempt:', logError));
    
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register',
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin must be a boolean'),
  async (req, res) => {
    try {
      // Check for validation errors
      if (handleValidationErrors(req, res)) return;
    const { username, email, password, isAdmin } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Check if user already exists
    const existingUser = await getUserByUsernameOrEmail(username, email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      isAdmin: isAdmin || false,
      contributionPoints: 0,
      joinDate: new Date(),
      badges: [],
      achievements: [],
      streakDays: 0,
      lastActivityDate: new Date()
    };

    const userId = await createUser(newUser);
    const createdUser = await getUserById(userId);

    const { password: _, ...userWithoutPassword } = createdUser;
    res.json({ success: true, user: userWithoutPassword });

    // Log account creation
    await logAccountCreation({
      username,
      email,
      ip_address: ip
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/auth/users - for switching users (student/admin)
router.get('/users', async (req, res) => {
  try {
    const usersList = await getAllUsers();
    const usersWithoutPassword = usersList.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPassword);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/users/:id/profile-picture - Update user profile picture
router.put('/users/:id/profile-picture',
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('profilePicture').isURL().withMessage('Profile picture must be a valid URL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { profilePicture } = req.body;
      await updateUser(req.params.id, { profilePicture });
      
      const updatedUser = await getUserById(req.params.id);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
      console.error('Error updating profile picture:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/auth/users/:id/offline-mode - Update user offline mode
router.put('/users/:id/offline-mode',
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('offlineMode').isBoolean().withMessage('Offline mode must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { offlineMode } = req.body;
      await updateUser(req.params.id, { offlineMode });
      
      const updatedUser = await getUserById(req.params.id);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
      console.error('Error updating offline mode:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/auth/users/:id - Update user data (XP, level, badges, etc.)
router.put('/users/:id',
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('currentXP').optional().isInt().withMessage('Current XP must be an integer'),
    body('level').optional().isInt().withMessage('Level must be an integer'),
    body('badges').optional().isArray().withMessage('Badges must be an array'),
    body('achievements').optional().isArray().withMessage('Achievements must be an array'),
    body('streakDays').optional().isInt().withMessage('Streak days must be an integer'),
    body('contributionPoints').optional().isInt().withMessage('Contribution points must be an integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.params.id;
      const updateData = {};

      // Only include fields that are provided in the request
      if (req.body.currentXP !== undefined) updateData.currentXP = req.body.currentXP;
      if (req.body.level !== undefined) updateData.level = req.body.level;
      if (req.body.badges !== undefined) updateData.badges = req.body.badges;
      if (req.body.achievements !== undefined) updateData.achievements = req.body.achievements;
      if (req.body.streakDays !== undefined) updateData.streakDays = req.body.streakDays;
      if (req.body.contributionPoints !== undefined) updateData.contributionPoints = req.body.contributionPoints;
      if (req.body.lastActivityDate !== undefined) updateData.lastActivityDate = req.body.lastActivityDate;

      await updateUser(userId, updateData);

      const updatedUser = await getUserById(userId);
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
      console.error('Error updating user data:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;