import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { createServer } from 'http';
import { Server } from 'socket.io';


import authRoutes from './routes/auth.js';
import notesRoutes, { permissionRouter } from './routes/notes.js';
import notebooksRoutes from './routes/notebooks.js';
import aiRoutes from './routes/ai.js';
import aiChatRoutes from './routes/ai-chat.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import eventsRoutes from './routes/events.js';
import agendasRoutes from './routes/agendas.js';
import tasksRoutes from './routes/tasks.js';
import todosRoutes from './routes/todos.js';
import trashRoutes from './routes/trash.js';
import { authenticateToken } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import { setupCollaboration } from './services/collaboration.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Clean and validate frontend URL
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").trim();
console.log('Frontend URL:', frontendUrl);

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    credentials: true
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json({ limit: '10mb' }));



// Routes
app.use('/api/auth', authRoutes);
// Shared notes route with conditional authentication
app.get('/api/notes/shared/:shareId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, nb.title as notebook_name, sl.permission, sl.visibility 
      FROM notes n 
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id 
      JOIN sharing_links sl ON n.id = sl.note_id 
      WHERE sl.share_id = $1 AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    `, [req.params.shareId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shared note not found or expired' });
    }
    
    const sharedNote = result.rows[0];
    
    // For public notes, allow access without authentication
    if (sharedNote.visibility === 'public') {
      return res.json(sharedNote);
    }
    
    // For private notes, check authentication and handle permission requests
    if (sharedNote.visibility === 'private') {
      // Try to authenticate the user
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(403).json({ 
          error: 'Login required to request access',
          requiresAuth: true,
          noteId: sharedNote.id,
          noteTitle: sharedNote.title
        });
      }
      
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        
        // Get user details
        const userResult = await pool.query(
          'SELECT id, email, name FROM users WHERE id = $1',
          [decoded.userId]
        );
        
        if (userResult.rows.length === 0) {
          return res.status(403).json({ 
            error: 'Invalid user',
            requiresAuth: true
          });
        }
        
        const user = userResult.rows[0];
        
        // Check if user is the owner
        if (sharedNote.owner_id === user.id) {
          return res.json(sharedNote);
        }
        
        // Check if user has approved permission
        const permissionResult = await pool.query(
          'SELECT status FROM permission_requests WHERE note_id = $1 AND requester_id = $2',
          [sharedNote.id, user.id]
        );
        
        if (permissionResult.rows.length > 0) {
          const permission = permissionResult.rows[0];
          if (permission.status === 'approved') {
            return res.json(sharedNote);
          } else if (permission.status === 'pending') {
            return res.status(403).json({ 
              error: 'Permission request pending',
              status: 'pending',
              userEmail: user.email,
              noteId: sharedNote.id,
              noteTitle: sharedNote.title
            });
          } else {
            return res.status(403).json({ 
              error: 'Permission request denied',
              status: 'denied',
              userEmail: user.email,
              noteId: sharedNote.id,
              noteTitle: sharedNote.title
            });
          }
        }
        
        // No permission request exists, return info to create one
        return res.status(403).json({ 
          error: 'Permission required',
          requiresPermission: true,
          userEmail: user.email,
          noteId: sharedNote.id,
          noteTitle: sharedNote.title
        });
        
      } catch (jwtError) {
        return res.status(403).json({ 
          error: 'Login required to request access',
          requiresAuth: true,
          noteId: sharedNote.id,
          noteTitle: sharedNote.title
        });
      }
    }
    
    res.json(sharedNote);
  } catch (error) {
    console.error('Get shared note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Request permission for shared note
app.post('/api/notes/shared/:shareId/request', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Get note from share ID
    const noteResult = await pool.query(`
      SELECT n.id, n.title, n.owner_id 
      FROM notes n 
      JOIN sharing_links sl ON n.id = sl.note_id 
      WHERE sl.share_id = $1 AND sl.visibility = 'private'
    `, [req.params.shareId]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    const note = noteResult.rows[0];
    
    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id, status FROM permission_requests WHERE note_id = $1 AND requester_id = $2',
      [note.id, req.user.id]
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Permission request already exists',
        status: existingRequest.rows[0].status
      });
    }
    
    // Create permission request
    const result = await pool.query(`
      INSERT INTO permission_requests (note_id, requester_id, owner_id, message, status) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [note.id, req.user.id, note.owner_id, message, 'pending']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Request permission for shared note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.use('/api/notes', authenticateToken, notesRoutes);
app.use('/api/permissions', authenticateToken, permissionRouter);
app.use('/api/notebooks', authenticateToken, notebooksRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/ai', authenticateToken, aiChatRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/events', authenticateToken, eventsRoutes);
app.use('/api/agendas', authenticateToken, agendasRoutes);
app.use('/api/tasks', authenticateToken, tasksRoutes);
app.use('/api/todos', authenticateToken, todosRoutes);
app.use('/api/trash', authenticateToken, trashRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Keep alive endpoint for cron jobs
app.get('/keep-alive', (req, res) => {
  res.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Setup real-time collaboration
setupCollaboration(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});