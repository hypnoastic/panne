import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import { authApi, notesApi } from '../services/api';
import aiAnimation from '../assets/ai.json';
import helloAnimation from '../assets/hello.json';
import './DashboardPage.css';

// AI Chat API
const aiChatApi = {
  sendMessage: async (message) => {
    const response = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  },
  formatToNote: async (chatHistory) => {
    const response = await fetch('http://localhost:5000/api/ai/format-note', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ chatHistory })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser
  });

  // Real data queries
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  // Real data with limits
  const upcomingEvents = [].slice(0, 1); // Max 1 event
  const recentTasks = [].slice(0, 2); // Max 2 tasks
  const recentNotes = notes
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 3)
    .map(note => ({
      id: note.id,
      title: note.title,
      preview: (note.content && typeof note.content === 'string') ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'No content',
      updatedAt: new Date(note.updated_at).toLocaleDateString()
    }));

  const sendMessageMutation = useMutation({
    mutationFn: aiChatApi.sendMessage,
    onMutate: () => {
      setIsTyping(true);
      // Add user message immediately
      setChatMessages(prev => [...prev, { type: 'user', content: currentMessage }]);
    },
    onSuccess: (response) => {
      setChatMessages(prev => [...prev, { type: 'ai', content: response.message }]);
      setCurrentMessage('');
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('AI Chat error:', error);
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
      setCurrentMessage('');
      setIsTyping(false);
    }
  });

  const formatToNoteMutation = useMutation({
    mutationFn: aiChatApi.formatToNote,
    onSuccess: (response) => {
      // Clear chat and show success message
      setChatMessages([]);
      // Navigate to notes with the AI notebook
      navigate('/notes');
    },
    onError: (error) => {
      console.error('Format note error:', error);
      // Show error message in chat
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Sorry, I could not format the conversation into a note. Please try again.' 
      }]);
    }
  });

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      sendMessageMutation.mutate(currentMessage);
    }
  };

  const handleFormatToNote = () => {
    if (chatMessages.length > 0) {
      formatToNoteMutation.mutate(chatMessages);
    }
  };

  return (
    <AppLayout>
      <div className="dashboard-page">
        <div className="dashboard-content">
          {/* Left Column - 60% */}
          <div className="dashboard-main">
            <div className="welcome-section glass">
              <div className="welcome-content">
                <Lottie animationData={helloAnimation} style={{ width: 60, height: 60 }} />
                <div className="welcome-text">
                  <h1>Welcome back, {user?.name}!</h1>
                  <p>Here's what's happening today</p>
                </div>
              </div>
            </div>

            <div className="upcoming-events glass">
              <h2>Upcoming Events</h2>
              <div className="events-list">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                  <motion.div
                    key={event.id}
                    className="event-card"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="event-date">
                      <span className="date">{new Date(event.date).getDate()}</span>
                      <span className="month">{new Date(event.date).toLocaleDateString('en', { month: 'short' })}</span>
                    </div>
                    <div className="event-details">
                      <h3>{event.title}</h3>
                      <p>{event.time}</p>
                    </div>
                  </motion.div>
                )) : (
                  <div className="empty-state-mini">
                    <p>No upcoming events</p>
                  </div>
                )}
              </div>
            </div>

            <div className="recent-tasks glass">
              <h2>Task Reminders</h2>
              <div className="tasks-list">
                {recentTasks.length > 0 ? recentTasks.map(task => (
                  <motion.div
                    key={task.id}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="task-checkbox">
                      <input type="checkbox" checked={task.completed} readOnly />
                    </div>
                    <span className="task-title">{task.title}</span>
                  </motion.div>
                )) : (
                  <div className="empty-state-mini">
                    <p>No pending tasks</p>
                  </div>
                )}
              </div>
            </div>

            <div className="recent-notes glass">
              <h2>Recent Notes</h2>
              <div className="notes-grid">
                {recentNotes.length > 0 ? recentNotes.map(note => (
                  <motion.div
                    key={note.id}
                    className="note-card"
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <h3>{note.title}</h3>
                    <p>{note.preview}</p>
                    <span className="note-time">{note.updatedAt}</span>
                  </motion.div>
                )) : (
                  <div className="empty-state-mini">
                    <p>No notes yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - 40% */}
          <div className="dashboard-sidebar">
            <div className="ai-chat-window glass">
              <div className="chat-header">
                <h3>AI Assistant</h3>
                {chatMessages.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleFormatToNote}
                    loading={formatToNoteMutation.isPending}
                  >
                    Format to Note
                  </Button>
                )}
              </div>

              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="chat-placeholder">
                    <div className="placeholder-image">
                      <Lottie animationData={aiAnimation} style={{ width: 300, height: 300 }} />
                    </div>
                    <h4>Start a conversation</h4>
                    <p>Ask me anything about your notes, tasks, or get help with your work.</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    <AnimatePresence>
                      {chatMessages.map((message, index) => (
                        <motion.div
                          key={index}
                          className={`message ${message.type}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <div className="message-content">
                            {message.content}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isTyping && (
                      <motion.div
                        className="message ai typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="chat-input">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  loading={sendMessageMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}