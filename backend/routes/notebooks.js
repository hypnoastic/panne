import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all notebooks for user with pagination, search, and sorting
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
    const validSorts = ['created_at', 'title', 'updated_at'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
    
    let whereClause = 'WHERE nb.owner_id = $1 AND nb.deleted_at IS NULL';
    const params = [req.user.id];
    
    if (search) {
      whereClause += ` AND nb.title ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    if (date_from) {
      whereClause += ` AND nb.created_at >= $${params.length + 1}`;
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ` AND nb.created_at <= $${params.length + 1}`;
      params.push(date_to);
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notebooks nb 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);
    
    // Get paginated data
    const dataQuery = `
      SELECT nb.*, COUNT(n.id) as note_count 
      FROM notebooks nb 
      LEFT JOIN notes n ON nb.id = n.notebook_id AND n.deleted_at IS NULL
      ${whereClause}
      GROUP BY nb.id 
      ORDER BY nb.${sortField} ${sortOrder}
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
    console.error('Get notebooks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notebook
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO notebooks (title, owner_id) 
      VALUES ($1, $2) 
      RETURNING *
    `, [name, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create notebook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notebook
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    
    const result = await pool.query(`
      UPDATE notebooks 
      SET title = $1, updated_at = NOW() 
      WHERE id = $2 AND owner_id = $3 
      RETURNING *
    `, [name, req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update notebook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move notebook to trash
router.post('/:id/trash', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get notebook details
    const notebookResult = await pool.query(
      'SELECT * FROM notebooks WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );
    
    if (notebookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    
    const notebook = notebookResult.rows[0];
    
    // Add to trash table
    await pool.query(
      'INSERT INTO trash (user_id, item_id, item_type, title, data, deleted_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [req.user.id, id, 'notebook', notebook.title, JSON.stringify(notebook)]
    );
    
    // Mark as deleted
    await pool.query(
      'UPDATE notebooks SET deleted_at = NOW() WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );
    
    res.json({ message: 'Notebook moved to trash successfully' });
  } catch (error) {
    console.error('Move notebook to trash error:', error);
    res.status(500).json({ error: 'Failed to move notebook to trash' });
  }
});

// Delete notebook
router.delete('/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Move notes to no notebook
      await client.query(
        'UPDATE notes SET notebook_id = NULL WHERE notebook_id = $1 AND owner_id = $2',
        [req.params.id, req.user.id]
      );
      
      // Delete notebook
      const result = await client.query(
        'DELETE FROM notebooks WHERE id = $1 AND owner_id = $2 RETURNING id',
        [req.params.id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Notebook not found');
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Notebook deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete notebook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;