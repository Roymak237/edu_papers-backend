const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getUserById, updateUser, getAllUsers } = require('../db/db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// GET /api/users/profile/:userId - Get user profile data
router.get('/profile/:userId',
  param('userId').isInt().withMessage('User ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = await getUserById(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }
);

// PUT /api/users/profile-picture - Upload profile picture
router.put('/profile-picture',
  [
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('profilePicture').isURL().withMessage('Profile picture must be a valid URL')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId, profilePicture } = req.body;
      await updateUser(userId, { profilePicture });

      const updatedUser = await getUserById(userId);
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({ error: 'Failed to update profile picture' });
    }
  }
);

// PUT /api/users/settings - Update user settings
router.put('/settings',
  [
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('settings').isObject().withMessage('Settings must be an object')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId, settings } = req.body;

      // Validate settings structure
      const validSettings = {};
      if (settings.notifications !== undefined) {
        validSettings.notifications = settings.notifications;
      }
      if (settings.theme !== undefined) {
        validSettings.theme = settings.theme;
      }
      if (settings.language !== undefined) {
        validSettings.language = settings.language;
      }

      // Store settings as JSON in the database
      await updateUser(userId, { settings: JSON.stringify(validSettings) });

      const updatedUser = await getUserById(userId);
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: 'Failed to update user settings' });
    }
  }
);

// GET /api/users/registered - Get all registered users (admin only)
router.get('/registered', async (req, res) => {
  try {
    const users = await getAllUsers();
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPassword);
  } catch (error) {
    console.error('Error fetching registered users:', error);
    res.status(500).json({ error: 'Failed to fetch registered users' });
  }
});

module.exports = router;
