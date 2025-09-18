import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

const router = express.Router();

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { name, avatar_url, locale, timezone } = req.body;
    
    const result = await pool.query(`
      UPDATE users 
      SET name = $1, avatar_url = $2, locale = $3, timezone = $4, updated_at = NOW() 
      WHERE id = $5 
      RETURNING id, email, name, avatar_url, locale, timezone
    `, [name, avatar_url, locale, timezone, req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const { autoSave, realTimeCollab, aiSuggestions } = req.body;
    
    await pool.query(
      'UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify({ autoSave, realTimeCollab, aiSuggestions }), req.user.id]
    );
    
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get deleted notes (trash)
router.get('/trash', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, nb.title as notebook_name 
      FROM notes n 
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id 
      WHERE n.owner_id = $1 AND n.deleted_at IS NOT NULL
      ORDER BY n.deleted_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore note from trash
router.post('/trash/:id/restore', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notes 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL
      RETURNING *
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found in trash' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Restore note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permanently delete note
router.delete('/trash/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM notes 
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL
      RETURNING id
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found in trash' });
    }
    
    res.json({ message: 'Note permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;