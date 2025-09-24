import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all events for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE user_id = $1 ORDER BY date ASC, time ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    const { title, description, time, date } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO events (title, description, time, date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, time, date, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, time, date } = req.body;
    const result = await pool.query(
      'UPDATE events SET title = $1, description = $2, time = $3, date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [title, description, time, date, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move event to trash
router.post('/:id/trash', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event details
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventResult.rows[0];
    
    // Add to trash table
    await pool.query(
      'INSERT INTO trash (item_id, item_type, title, user_id) VALUES ($1, $2, $3, $4)',
      [id, 'event', event.title, req.user.id]
    );
    
    // Delete event
    await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    res.json({ message: 'Event moved to trash' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event (legacy endpoint)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;