import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/database.js';

const router = express.Router();

// AI query endpoint
router.post('/query', async (req, res) => {
  try {
    const { prompt, context, action } = req.body;
    
    // Use environment Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Gemini API key not configured in environment variables.' 
      });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
    
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ response: text });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

export default router;