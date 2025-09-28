import express from 'express';
import OpenAI from 'openai';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// AI query endpoint
router.post('/query', async (req, res) => {
  try {
    const { prompt, context, action } = req.body;
    
    // Use environment OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured in environment variables.' 
      });
    }
    
    const openai = new OpenAI({ apiKey });
    
    let systemPrompt = '';
    
    switch (action) {
      case 'summarize':
        systemPrompt = 'Summarize the following document into 3 key bullet points:';
        break;
      case 'improve':
        systemPrompt = 'Correct any spelling and grammar mistakes in the following text. Improve its clarity and flow while preserving the original meaning:';
        break;
      case 'tone':
        systemPrompt = `Rewrite the following text in a more "${context?.tone || 'professional'}" tone:`;
        break;
      case 'actions':
        systemPrompt = 'Analyze the following text and extract a list of all potential action items or tasks:';
        break;
      case 'query':
        systemPrompt = 'You are a helpful writing assistant. Provide responses in clean, well-formatted text that can be directly added to notes. Use proper headings, bullet points, and paragraphs. Be concise and actionable. Format your response as if it\'s content for a document:';
        break;
      default:
        systemPrompt = 'Help with the following:';
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });
    
    const text = completion.choices[0].message.content;
    res.json({ response: text });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Chat endpoints
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = [], chatId } = req.body;
    const userId = req.user.id;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured in environment variables.' 
      });
    }
    
    const openai = new OpenAI({ apiKey });
    
    // Build context from selected notes
    let contextPrompt = '';
    if (context.length > 0) {
      contextPrompt = '\n\nContext from selected notes:\n';
      context.forEach((note, index) => {
        contextPrompt += `\n--- Note ${index + 1}: ${note.title} ---\n${note.content}\n`;
      });
      contextPrompt += '\n--- End of Context ---\n\n';
    }
    
    const systemMessage = `You are PanneAI, an intelligent assistant integrated into a note-taking and productivity platform called Panne. You help users with their notes, tasks, and productivity questions.

Key guidelines:
- Be helpful, concise, and actionable
- When context from notes is provided, reference and build upon that information
- Format responses clearly with proper structure
- If asked about creating content, provide well-formatted text suitable for notes
- Be conversational but professional

${contextPrompt}`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const text = completion.choices[0].message.content;
    
    // Store messages in database
    if (chatId) {
      // Get existing chat
      const chatResult = await pool.query(
        'SELECT messages FROM ai_chats WHERE id = $1 AND user_id = $2',
        [chatId, userId]
      );
      
      if (chatResult.rows.length > 0) {
        const existingMessages = chatResult.rows[0].messages || [];
        const updatedMessages = [
          ...existingMessages,
          { type: 'user', content: message, timestamp: new Date().toISOString() },
          { type: 'ai', content: text, timestamp: new Date().toISOString() }
        ];
        
        await pool.query(
          'UPDATE ai_chats SET messages = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [JSON.stringify(updatedMessages), chatId, userId]
        );
      }
    }
    
    res.json({ message: text });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process AI chat request' });
  }
});

router.post('/export-to-note', authenticateToken, async (req, res) => {
  try {
    const { chatId, selectedNotes = [] } = req.body;
    const userId = req.user.id;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured in environment variables.' 
      });
    }
    
    // Get chat from database
    const chatResult = await pool.query(
      'SELECT messages, title FROM ai_chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatHistory = chatResult.rows[0].messages || [];
    
    const openai = new OpenAI({ apiKey });
    
    // Build chat history for summarization
    let chatText = '';
    chatHistory.forEach((msg, index) => {
      chatText += `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}\n\n`;
    });
    
    // Context from selected notes
    let contextInfo = '';
    if (selectedNotes.length > 0) {
      contextInfo = '\n\nThis conversation referenced the following notes:\n';
      selectedNotes.forEach((note, index) => {
        contextInfo += `- ${note.title}\n`;
      });
    }
    
    const summarizePrompt = `Please create a well-structured summary of this AI conversation that would be suitable as a note. Include:

1. A clear title
2. Key points discussed
3. Important insights or conclusions
4. Any action items or next steps
5. Relevant information from the context

Format it as a proper note with headings and bullet points.

Conversation:
${chatText}${contextInfo}`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Format conversations into well-structured notes with proper headings, bullet points, and key takeaways. Make it useful for future reference." 
        },
        { role: "user", content: summarizePrompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });
    
    const summaryText = completion.choices[0].message.content;
    
    // Extract title from summary (first line or generate one)
    const lines = summaryText.split('\n');
    const title = lines[0].replace(/^#+\s*/, '') || 'AI Chat Summary';
    const content = summaryText;
    
    // Get AI Notes notebook
    const notebookResult = await pool.query(
      'SELECT id FROM notebooks WHERE title = $1 AND owner_id = $2',
      ['AI Notes', userId]
    );
    
    const notebookId = notebookResult.rows[0].id;
    
    // Create the note
    const contentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: content
        }]
      }]
    };
    
    const noteResult = await pool.query(
      'INSERT INTO notes (title, content, owner_id, notebook_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [title, JSON.stringify(contentJson), userId, notebookId]
    );
    
    res.json({ 
      message: 'Chat exported to notes successfully',
      note: noteResult.rows[0]
    });
  } catch (error) {
    console.error('Export to note error:', error);
    res.status(500).json({ error: 'Failed to export chat to note' });
  }
});

// Chat storage endpoints
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM ai_chats WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

router.post('/chats', authenticateToken, async (req, res) => {
  try {
    const { title, messages } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      'INSERT INTO ai_chats (title, messages, user_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [title, JSON.stringify(messages), userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save chat error:', error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

// Move chat to trash
router.post('/chats/:id/trash', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get chat details
    const chatResult = await pool.query(
      'SELECT * FROM ai_chats WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chat = chatResult.rows[0];
    
    // Add to trash table
    await pool.query(
      'INSERT INTO trash (user_id, item_id, item_type, title, data, deleted_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [userId, id, 'chat', chat.title, JSON.stringify(chat)]
    );
    
    // Mark as deleted
    await pool.query(
      'UPDATE ai_chats SET deleted_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ message: 'Chat moved to trash successfully' });
  } catch (error) {
    console.error('Move chat to trash error:', error);
    res.status(500).json({ error: 'Failed to move chat to trash' });
  }
});

router.delete('/chats/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'DELETE FROM ai_chats WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;
