const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getUserById } = require('../db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// GET /api/media/background - Get background video/image
router.get('/background', async (req, res) => {
  try {
    const conn = await require('../db').connection;

    // Get active background media
    const [rows] = await conn.query(
      'SELECT * FROM background_media WHERE isActive = TRUE ORDER BY uploadedAt DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({ message: 'No active background media found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching background media:', error);
    res.status(500).json({ error: 'Failed to fetch background media' });
  }
});

// GET /api/media/background/all - Get all background media
router.get('/background/all', async (req, res) => {
  try {
    const conn = await require('../db').connection;

    const [rows] = await conn.query(
      'SELECT * FROM background_media ORDER BY uploadedAt DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching all background media:', error);
    res.status(500).json({ error: 'Failed to fetch background media' });
  }
});

// POST /api/admin/media/background - Upload background media (admin only)
router.post('/admin/media/background',
  [
    body('mediaUrl').isURL().withMessage('Media URL must be a valid URL'),
    body('mediaType').isIn(['video', 'image']).withMessage('Media type must be video or image'),
    body('uploadedBy').isInt().withMessage('Uploaded by must be an integer'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { mediaUrl, mediaType, uploadedBy, isActive } = req.body;

      // Verify user is admin
      const user = await getUserById(uploadedBy);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Only admins can upload background media' });
      }

      const conn = await require('../db').connection;

      // If this is set as active, deactivate all other media of the same type
      if (isActive) {
        await conn.query(
          'UPDATE background_media SET isActive = FALSE WHERE mediaType = ?',
          [mediaType]
        );
      }

      // Insert new background media
      const [result] = await conn.query(
        'INSERT INTO background_media (mediaType, mediaUrl, isActive, uploadedBy, uploadedAt) VALUES (?, ?, ?, ?, ?)',
        [mediaType, mediaUrl, isActive || false, uploadedBy, new Date()]
      );

      // Fetch the newly created media
      const [rows] = await conn.query(
        'SELECT * FROM background_media WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error uploading background media:', error);
      res.status(500).json({ error: 'Failed to upload background media' });
    }
  }
);

// PUT /api/admin/media/background/:id - Update background media (admin only)
router.put('/admin/media/background/:id',
  [
    param('id').isInt().withMessage('Media ID must be an integer'),
    body('mediaUrl').optional().isURL().withMessage('Media URL must be a valid URL'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('uploadedBy').isInt().withMessage('Uploaded by must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const { mediaUrl, isActive, uploadedBy } = req.body;

      // Verify user is admin
      const user = await getUserById(uploadedBy);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Only admins can update background media' });
      }

      const conn = await require('../db').connection;

      // Check if media exists
      const [existingMedia] = await conn.query(
        'SELECT * FROM background_media WHERE id = ?',
        [id]
      );

      if (existingMedia.length === 0) {
        return res.status(404).json({ error: 'Background media not found' });
      }

      // If this is set as active, deactivate all other media of the same type
      if (isActive) {
        await conn.query(
          'UPDATE background_media SET isActive = FALSE WHERE mediaType = ? AND id != ?',
          [existingMedia[0].mediaType, id]
        );
      }

      // Update background media
      const updateData = {};
      if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
      if (isActive !== undefined) updateData.isActive = isActive;

      const fields = Object.keys(updateData).map(key => `${key} = ?`);
      const values = Object.values(updateData);
      values.push(id);

      await conn.query(
        `UPDATE background_media SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // Fetch updated media
      const [rows] = await conn.query(
        'SELECT * FROM background_media WHERE id = ?',
        [id]
      );

      res.json(rows[0]);
    } catch (error) {
      console.error('Error updating background media:', error);
      res.status(500).json({ error: 'Failed to update background media' });
    }
  }
);

// DELETE /api/admin/media/background/:id - Delete background media (admin only)
router.delete('/admin/media/background/:id',
  [
    param('id').isInt().withMessage('Media ID must be an integer'),
    body('uploadedBy').isInt().withMessage('Uploaded by must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const { uploadedBy } = req.body;

      // Verify user is admin
      const user = await getUserById(uploadedBy);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Only admins can delete background media' });
      }

      const conn = await require('../db').connection;

      // Delete background media
      const [result] = await conn.query(
        'DELETE FROM background_media WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Background media not found' });
      }

      res.json({ success: true, message: 'Background media deleted successfully' });
    } catch (error) {
      console.error('Error deleting background media:', error);
      res.status(500).json({ error: 'Failed to delete background media' });
    }
  }
);

module.exports = router;
