import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all agendas for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agendas WHERE user_id = $1::uuid ORDER BY created_at DESC',
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