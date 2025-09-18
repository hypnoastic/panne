import express from 'express';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all notes for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, nb.title as notebook_name 
      FROM notes n 
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id 
      WHERE n.owner_id = $1 AND n.deleted_at IS NULL
      ORDER BY n.updated_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, nb.title as notebook_name 
      FROM notes n 
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id 
      WHERE n.id = $1 AND n.owner_id = $2 AND n.deleted_at IS NULL
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create note
router.post('/', async (req, res) => {
  try {
    const { title, content, notebook_id } = req.body;
    
    // If no notebook_id provided, create a default notebook first
    let finalNotebookId = notebook_id;
    
    if (!finalNotebookId) {
      // Check if user has a default notebook
      const defaultNotebook = await pool.query(
        'SELECT id FROM notebooks WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1',
        [req.user.id]
      );
      
      if (defaultNotebook.rows.length === 0) {
        // Create a default notebook
        const newNotebook = await pool.query(
          'INSERT INTO notebooks (title, owner_id) VALUES ($1, $2) RETURNING id',
          ['My Notes', req.user.id]
        );
        finalNotebookId = newNotebook.rows[0].id;
      } else {
        finalNotebookId = defaultNotebook.rows[0].id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO notes (title, content, notebook_id, owner_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [title || 'Untitled Note', content || {}, finalNotebookId, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    // Create version before updating
    const currentNote = await pool.query(
      'SELECT content FROM notes WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (currentNote.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Save current content as version
    await pool.query(`
      INSERT INTO versions (note_id, content, user_id) 
      VALUES ($1, $2, $3)
    `, [req.params.id, currentNote.rows[0].content, req.user.id]);
    
    // Update note
    const result = await pool.query(`
      UPDATE notes 
      SET title = $1, content = $2, updated_at = NOW() 
      WHERE id = $3 AND owner_id = $4 
      RETURNING *
    `, [title, content, req.params.id, req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete note (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notes 
      SET deleted_at = NOW(), updated_at = NOW() 
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note moved to trash' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get note versions
router.get('/:id/versions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.name as created_by_name 
      FROM versions v 
      JOIN users u ON v.user_id = u.id 
      WHERE v.note_id = $1 
      ORDER BY v.created_at DESC
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore version
router.post('/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get version content
      const version = await client.query(
        'SELECT content FROM versions WHERE id = $1 AND note_id = $2',
        [req.params.versionId, req.params.id]
      );
      
      if (version.rows.length === 0) {
        throw new Error('Version not found');
      }
      
      // Save current content as new version
      const currentNote = await client.query(
        'SELECT content FROM notes WHERE id = $1 AND owner_id = $2',
        [req.params.id, req.user.id]
      );
      
      const versionCount = await client.query(
        'SELECT COUNT(*) FROM versions WHERE note_id = $1',
        [req.params.id]
      );
      
      const nextVersion = parseInt(versionCount.rows[0].count) + 1;
      
      await client.query(`
        INSERT INTO versions (note_id, content, version_number, user_id) 
        VALUES ($1, $2, $3, $4)
      `, [req.params.id, currentNote.rows[0].content, nextVersion, req.user.id]);
      
      // Update note with version content
      const result = await client.query(`
        UPDATE notes 
        SET content = $1, updated_at = NOW() 
        WHERE id = $2 AND owner_id = $3 
        RETURNING *
      `, [version.rows[0].content, req.params.id, req.user.id]);
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get note collaborators
router.get('/:id/collaborators', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name, u.email, u.avatar_url 
      FROM collaborators c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.note_id = $1
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add collaborator
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { email, permission = 'edit' } = req.body;
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Check if already a collaborator
    const existingCollab = await pool.query(
      'SELECT id FROM collaborators WHERE note_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    
    if (existingCollab.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }
    
    // Add collaborator
    const result = await pool.query(`
      INSERT INTO collaborators (note_id, user_id, permission, invited_by) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [req.params.id, userId, permission, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create sharing link
router.post('/:id/share', async (req, res) => {
  try {
    const { permission = 'viewer', expires_at } = req.body;
    const shareId = uuidv4();
    
    // Map permission values to database constraint values
    const roleMap = { 'view': 'viewer', 'edit': 'editor', 'viewer': 'viewer', 'editor': 'editor' };
    const role = roleMap[permission] || 'viewer';
    
    const result = await pool.query(`
      INSERT INTO sharing_links (note_id, token, role, expires_at) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [req.params.id, shareId, role, expires_at]);
    
    res.status(201).json({
      ...result.rows[0],
      share_url: `${process.env.FRONTEND_URL}/share/${shareId}`
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shared note by share ID
router.get('/shared/:shareId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, nb.title as notebook_name, sl.role as permission 
      FROM notes n 
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id 
      JOIN sharing_links sl ON n.id = sl.note_id 
      WHERE sl.token = $1 AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    `, [req.params.shareId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shared note not found or expired' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get shared note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;