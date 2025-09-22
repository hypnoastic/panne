import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all trash items for user with search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = `
      SELECT id, item_id, item_type, title, deleted_at
      FROM trash 
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    
    if (type && type !== 'all') {
      query += ` AND item_type = $${params.length + 1}`;
      params.push(type);
    }
    
    if (search) {
      query += ` AND title ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY deleted_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({ error: 'Failed to fetch trash items' });
  }
});

// Restore item from trash
router.post('/:id/restore', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Get trash item
    const trashResult = await pool.query(`
      SELECT * FROM trash WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (trashResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    const trashItem = trashResult.rows[0];
    const { item_type, item_id } = trashItem;

    // Validate parent exists for notes and tasks
    if (item_type === 'note') {
      const noteResult = await pool.query(`
        SELECT notebook_id FROM notes WHERE id = $1
      `, [item_id]);
      
      if (noteResult.rows.length > 0) {
        const notebookExists = await pool.query(`
          SELECT id FROM notebooks WHERE id = $1 AND deleted_at IS NULL
        `, [noteResult.rows[0].notebook_id]);
        
        if (notebookExists.rows.length === 0) {
          return res.status(400).json({ 
            error: 'Cannot restore note: parent notebook no longer exists' 
          });
        }
      }
    } else if (item_type === 'task') {
      // For tasks, we need to recreate them since they were hard deleted
      return res.status(400).json({ 
        error: 'Cannot restore task: task data was permanently deleted' 
      });
    } else if (item_type === 'event') {
      // For events, we need to recreate them since they were hard deleted
      return res.status(400).json({ 
        error: 'Cannot restore event: event data was permanently deleted' 
      });
    }

    // Restore based on type
    if (item_type === 'chat') {
      await pool.query(`
        UPDATE ai_chats SET deleted_at = NULL WHERE id = $1 AND user_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'notebook') {
      await pool.query(`
        UPDATE notebooks SET deleted_at = NULL WHERE id = $1 AND owner_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'agenda') {
      await pool.query(`
        UPDATE agendas SET deleted_at = NULL WHERE id = $1 AND user_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'note') {
      await pool.query(`
        UPDATE notes SET deleted_at = NULL WHERE id = $1 AND owner_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'event') {
      // Events are hard deleted, cannot restore
      return res.status(400).json({ 
        error: 'Cannot restore event: event data was permanently deleted' 
      });
    }

    // Remove from trash
    await pool.query(`
      DELETE FROM trash WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring item:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// Permanently delete item
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Get trash item
    const trashResult = await pool.query(`
      SELECT * FROM trash WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (trashResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    const trashItem = trashResult.rows[0];
    const { item_type, item_id } = trashItem;

    // Permanently delete based on type
    if (item_type === 'chat') {
      await pool.query(`
        DELETE FROM ai_chats WHERE id = $1 AND user_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'notebook') {
      await pool.query(`
        DELETE FROM notebooks WHERE id = $1 AND owner_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'agenda') {
      await pool.query(`
        DELETE FROM agendas WHERE id = $1 AND user_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'note') {
      await pool.query(`
        DELETE FROM notes WHERE id = $1 AND owner_id = $2
      `, [item_id, req.user.id]);
    } else if (item_type === 'task') {
      // Tasks are already hard deleted, just remove from trash
    } else if (item_type === 'event') {
      // Events are already hard deleted, just remove from trash
    }

    // Remove from trash
    await pool.query(`
      DELETE FROM trash WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting item:', error);
    res.status(500).json({ error: 'Failed to permanently delete item' });
  }
});

export default router;