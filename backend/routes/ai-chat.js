import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat with AI
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a helpful AI assistant integrated into a note-taking app called Panne. 
    Respond in a conversational, helpful manner. Keep responses concise but informative.
    User message: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// Format chat to note
router.post('/format-note', authenticateToken, async (req, res) => {
  try {
    const { chatHistory } = req.body;
    
    if (!chatHistory || chatHistory.length === 0) {
      return res.status(400).json({ error: 'Chat history is required' });
    }

    // Get or create AI notebook
    let aiNotebook = await pool.query(
      'SELECT * FROM notebooks WHERE user_id = $1 AND title = $2',
      [req.user.id, 'AI Conversations']
    );

    if (aiNotebook.rows.length === 0) {
      const newNotebook = await pool.query(
        'INSERT INTO notebooks (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
        [req.user.id, 'AI Conversations', 'Notes generated from AI conversations']
      );
      aiNotebook = newNotebook;
    } else {
      aiNotebook = aiNotebook;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Format chat history into a structured note
    const chatText = chatHistory.map(msg => 
      `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}`
    ).join('\n\n');

    const prompt = `Format the following conversation into a well-structured note with proper headings, bullet points, and key takeaways. Make it useful for future reference:

${chatText}

Please format this as a clean, organized note with:
- A descriptive title
- Key points discussed
- Important insights or conclusions
- Action items if any`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const formattedNote = response.text();

    // Extract title from the formatted note (first line)
    const lines = formattedNote.split('\n');
    const title = lines[0].replace(/^#+\s*/, '') || 'AI Conversation Note';
    
    // Create the note
    const noteResult = await pool.query(
      'INSERT INTO notes (user_id, notebook_id, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, aiNotebook.rows[0].id, title, formattedNote]
    );

    res.json({ 
      success: true, 
      note: noteResult.rows[0],
      notebook: aiNotebook.rows[0]
    });
  } catch (error) {
    console.error('Format note error:', error);
    res.status(500).json({ error: 'Failed to format note' });
  }
});

// Export chat to note
router.post('/export-to-note', authenticateToken, async (req, res) => {
  try {
    const { chatHistory } = req.body;
    
    if (!chatHistory || chatHistory.length === 0) {
      return res.status(400).json({ error: 'Chat history is required' });
    }

    // Get or create AI Notes notebook
    let aiNotebook = await pool.query(
      'SELECT * FROM notebooks WHERE owner_id = $1 AND title = $2',
      [req.user.id, 'AI Notes']
    );

    if (aiNotebook.rows.length === 0) {
      const newNotebook = await pool.query(
        'INSERT INTO notebooks (owner_id, title) VALUES ($1, $2) RETURNING *',
        [req.user.id, 'AI Notes']
      );
      aiNotebook = newNotebook;
    }

    // Format chat history into a note
    const chatText = chatHistory.map(msg => 
      `**${msg.type === 'user' ? 'You' : 'PanneAI'}:** ${msg.content}`
    ).join('\n\n');

    // Generate title from first user message
    const firstUserMessage = chatHistory.find(msg => msg.type === 'user');
    const title = firstUserMessage ? 
      (firstUserMessage.content.length > 50 ? 
        firstUserMessage.content.substring(0, 50) + '...' : 
        firstUserMessage.content) : 
      'AI Conversation';
    
    // Create content as JSON object for JSONB column
    const contentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: chatText
        }]
      }]
    };
    
    // Create the note
    const noteResult = await pool.query(
      'INSERT INTO notes (owner_id, notebook_id, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, aiNotebook.rows[0].id, title, JSON.stringify(contentJson)]
    );

    res.json({ 
      success: true, 
      note: noteResult.rows[0],
      notebook: aiNotebook.rows[0]
    });
  } catch (error) {
    console.error('Export to note error:', error);
    res.status(500).json({ error: 'Failed to export to note' });
  }
});

export default router;