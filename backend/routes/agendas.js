import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all agendas for user with pagination, search, and sorting
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 5, 
      search = '', 
      date_from, 
      date_to, 
      sort = 'created_at', 
      order = 'desc' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSorts = ['created_at', 'name', 'updated_at'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
    
    let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';
    const params = [req.user.id];
    
    if (search) {
      whereClause += ` AND name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    if (date_from) {
      whereClause += ` AND created_at >= $${params.length + 1}`;
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ` AND created_at <= $${params.length + 1}`;
      params.push(date_to);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM agendas ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);
    
    // Get paginated data
    const dataQuery = `
      SELECT * FROM agendas 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(dataQuery, params);
    
    res.json({
      data: result.rows,
      totalItems,
      totalPages: Math.ceil(totalItems / parseInt(limit)),
      currentPage: parseInt(page)
    });
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
      'INSERT INTO agendas (name, user_id) VALUES ($1, $2) RETURNING *',
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
      'UPDATE agendas SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
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
      'SELECT * FROM agendas WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (agendaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    
    const agenda = agendaResult.rows[0];
    
    // Add to trash table
    await pool.query(
      'INSERT INTO trash (item_id, item_type, title, user_id) VALUES ($1, $2, $3, $4)',
      [id, 'agenda', agenda.name, req.user.id]
    );
    
    // Mark as deleted
    await pool.query(
      'UPDATE agendas SET deleted_at = NOW() WHERE id = $1 AND user_id = $2',
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
      'DELETE FROM agendas WHERE id = $1 AND user_id = $2 RETURNING *',
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