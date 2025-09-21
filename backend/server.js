import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';


import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import notebooksRoutes from './routes/notebooks.js';
import aiRoutes from './routes/ai.js';
import aiChatRoutes from './routes/ai-chat.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import eventsRoutes from './routes/events.js';
import agendasRoutes from './routes/agendas.js';
import tasksRoutes from './routes/tasks.js';
import todosRoutes from './routes/todos.js';
import { authenticateToken } from './middleware/auth.js';
import { setupCollaboration } from './services/collaboration.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});



// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', authenticateToken, notesRoutes);
app.use('/api/notebooks', authenticateToken, notebooksRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/ai', authenticateToken, aiChatRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/events', authenticateToken, eventsRoutes);
app.use('/api/agendas', authenticateToken, agendasRoutes);
app.use('/api/tasks', authenticateToken, tasksRoutes);
app.use('/api/todos', authenticateToken, todosRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Setup real-time collaboration
setupCollaboration(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});