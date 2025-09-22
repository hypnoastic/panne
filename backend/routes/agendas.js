import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all agendas for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agendas WHERE user_id = $1::uuid AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create agenda
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO agendas (name, user_id) VALUES ($1, $2::uuid) RETURNING *',
      [name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agenda
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      'UPDATE agendas SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3::uuid RETURNING *',
      [name, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move agenda to trash
router.post('/:id/trash', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get agenda details
    const agendaResult = await pool.query(
      'SELECT * FROM agendas WHERE id = $1 AND user_id = $2::uuid',
      [id, req.user.id]
    );
    
    if (agendaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    
    const agenda = agendaResult.rows[0];
    
    // Add to trash table
    await pool.query(
      'INSERT INTO trash (user_id, item_id, item_type, title, data, deleted_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [req.user.id, id, 'agenda', agenda.name, JSON.stringify(agenda)]
    );
    
    // Mark as deleted
    await pool.query(
      'UPDATE agendas SET deleted_at = NOW() WHERE id = $1 AND user_id = $2::uuid',
      [id, req.user.id]
    );
    
    res.json({ message: 'Agenda moved to trash successfully' });
  } catch (error) {
    console.error('Move agenda to trash error:', error);
    res.status(500).json({ error: 'Failed to move agenda to trash' });
  }
});

// Delete agenda
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM agendas WHERE id = $1 AND user_id = $2::uuid RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    res.json({ message: 'Agenda deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;