const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getUserById, updateUser } = require('../db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// POST /api/offline/enable - Enable offline mode for user
router.post('/enable',
  [
    body('userId').isInt().withMessage('User ID must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId } = req.body;
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await updateUser(userId, { offlineMode: true });

      res.json({ success: true, message: 'Offline mode enabled' });
    } catch (error) {
      console.error('Error enabling offline mode:', error);
      res.status(500).json({ error: 'Failed to enable offline mode' });
    }
  }
);

// POST /api/offline/disable - Disable offline mode for user
router.post('/disable',
  [
    body('userId').isInt().withMessage('User ID must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId } = req.body;
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await updateUser(userId, { offlineMode: false });

      res.json({ success: true, message: 'Offline mode disabled' });
    } catch (error) {
      console.error('Error disabling offline mode:', error);
      res.status(500).json({ error: 'Failed to disable offline mode' });
    }
  }
);

// POST /api/sync/offline-data - Sync offline changes when online
router.post('/offline-data',
  [
    body('userId').isInt().withMessage('User ID must be an integer'),
    body('actions').isArray().withMessage('Actions must be an array')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId, actions } = req.body;
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const conn = await require('../db').connection;
      const syncedActions = [];
      const failedActions = [];

      // Process each offline action
      for (const action of actions) {
        try {
          // Store the action in the offline_actions table
          const [result] = await conn.query(
            `INSERT INTO offline_actions 
             (userId, actionType, actionData, timestamp, synced, syncedAt) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              userId,
              action.type,
              JSON.stringify(action.data),
              action.timestamp || new Date(),
              true,
              new Date()
            ]
          );

          // Execute the action based on its type
          switch (action.type) {
            case 'quiz_attempt':
              await conn.query(
                `INSERT INTO quiz_attempts 
                 (userId, quizId, score, totalQuestions, answers, completedAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  userId,
                  action.data.quizId,
                  action.data.score,
                  action.data.totalQuestions,
                  JSON.stringify(action.data.answers),
                  new Date()
                ]
              );
              break;
            case 'paper_upload':
              await conn.query(
                `INSERT INTO papers 
                 (title, subject, level, year, uploaderId, uploaderName, contentType, status, fileType, uploadDate, description, tags, downloadCount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  action.data.title,
                  action.data.subject,
                  action.data.level,
                  action.data.year,
                  userId,
                  user.username,
                  action.data.contentType,
                  'pending',
                  action.data.fileType,
                  new Date(),
                  action.data.description,
                  JSON.stringify(action.data.tags || []),
                  0
                ]
              );
              break;
            case 'xp_update':
              await conn.query(
                `UPDATE users SET currentXP = currentXP + ? WHERE id = ?`,
                [action.data.xpEarned, userId]
              );
              break;
          }

          syncedActions.push({
            actionId: result.insertId,
            type: action.type,
            status: 'synced'
          });
        } catch (error) {
          console.error('Error syncing action:', error);
          failedActions.push({
            type: action.type,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        syncedCount: syncedActions.length,
        failedCount: failedActions.length,
        syncedActions,
        failedActions
      });
    } catch (error) {
      console.error('Error syncing offline data:', error);
      res.status(500).json({ error: 'Failed to sync offline data' });
    }
  }
);

// GET /api/sync/status - Check sync status
router.get('/status',
  [
    param('userId').isInt().withMessage('User ID must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId } = req.params;
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const conn = await require('../db').connection;

      // Get unsynced actions count
      const [unsyncedResult] = await conn.query(
        'SELECT COUNT(*) as count FROM offline_actions WHERE userId = ? AND synced = FALSE',
        [userId]
      );

      // Get last sync time
      const [lastSyncResult] = await conn.query(
        'SELECT MAX(syncedAt) as lastSync FROM offline_actions WHERE userId = ? AND synced = TRUE',
        [userId]
      );

      res.json({
        userId,
        offlineMode: user.offlineMode,
        pendingSyncCount: unsyncedResult[0].count,
        lastSync: lastSyncResult[0].lastSync,
        status: user.offlineMode ? 'offline' : 'online'
      });
    } catch (error) {
      console.error('Error checking sync status:', error);
      res.status(500).json({ error: 'Failed to check sync status' });
    }
  }
);

// GET /api/offline/actions/:userId - Get all offline actions for a user
router.get('/actions/:userId',
  param('userId').isInt().withMessage('User ID must be an integer'),
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { userId } = req.params;
      const { synced } = req.query;

      const conn = await require('../db').connection;

      let query = 'SELECT * FROM offline_actions WHERE userId = ?';
      const params = [userId];

      if (synced !== undefined) {
        query += ' AND synced = ?';
        params.push(synced === 'true');
      }

      query += ' ORDER BY timestamp DESC';

      const [rows] = await conn.query(query, params);

      const actions = rows.map(row => ({
        ...row,
        actionData: JSON.parse(row.actionData)
      }));

      res.json(actions);
    } catch (error) {
      console.error('Error fetching offline actions:', error);
      res.status(500).json({ error: 'Failed to fetch offline actions' });
    }
  }
);

module.exports = router;
