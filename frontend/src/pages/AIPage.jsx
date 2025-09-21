import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import { notesApi } from '../services/api';
import aiAnimation from '../assets/ai.json';
import './AIPage.css';

// AI Chat API
const aiChatApi = {
  sendMessage: async (message, context = []) => {
    const response = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ message, context })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  },
  exportToNote: async (chatHistory) => {
    const response = await fetch('http://localhost:5000/api/ai/export-to-note', {
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

export default function AIPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [chats, setChats] = useState([{ id: 1, title: 'New Chat', messages: [] }]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatNameModal, setShowChatNameModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');

  // Handle initial message from dashboard
  useEffect(() => {
    if (location.state?.initialMessage) {
      setCurrentMessage(location.state.initialMessage);
      if (location.state.selectedNotes) {
        setSelectedNotes(location.state.selectedNotes);
      }
      // Auto-send the message
      setTimeout(() => {
        handleSendMessage(location.state.initialMessage, location.state.selectedNotes || []);
      }, 100);
    }
  }, [location.state]);

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, context }) => aiChatApi.sendMessage(message, context),
    onMutate: () => {
      setIsTyping(true);
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

  const exportToNoteMutation = useMutation({
    mutationFn: aiChatApi.exportToNote,
    onSuccess: () => {
      setChatMessages([]);
      navigate('/notes');
    },
    onError: (error) => {
      console.error('Export note error:', error);
    }
  });

  const handleSendMessage = (message = currentMessage, notes = selectedNotes) => {
    if (message.trim()) {
      const context = notes.map(note => ({
        title: note.title,
        content: note.content
      }));
      sendMessageMutation.mutate({ message, context });
      
      // Update chat title if it's the first message
      if (chatMessages.length === 0) {
        const chatTitle = message.length > 30 ? message.substring(0, 30) + '...' : message;
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId ? { ...chat, title: chatTitle } : chat
        ));
      }
    }
  };

  const handleNoteSelection = (note) => {
    setSelectedNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) {
        return prev.filter(n => n.id !== note.id);
      } else {
        return [...prev, note];
      }
    });
  };

  const handleExportToNote = () => {
    if (chatMessages.length > 0) {
      exportToNoteMutation.mutate(chatMessages);
    }
  };

  const createNewChat = () => {
    setShowChatNameModal(true);
  };

  const handleCreateChat = () => {
    const newChatId = Date.now();
    const chatTitle = newChatName.trim() || 'New Chat';
    const newChat = { id: newChatId, title: chatTitle, messages: [] };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setChatMessages([]);
    setSelectedNotes([]);
    setShowChatNameModal(false);
    setNewChatName('');
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="ai-page">
        <div className="ai-layout">
          {/* Left Sidebar - Chat History */}
          <div className="ai-sidebar">
            <div className="sidebar-header">
              <div className="chat-title">Chat</div>
              <button className="plus-icon" onClick={createNewChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            
            <div className="search-chats">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ai-search-input"
              />
            </div>

            <div className="chats-list">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                  onClick={() => setCurrentChatId(chat.id)}
                >
                  <span>{chat.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Chat Area */}
          <div className="ai-main">
            <div className="ai-header">
              <h1>PanneAI</h1>
              {chatMessages.length > 0 && (
                <button className="export-btn" onClick={handleExportToNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                  </svg>
                  Export to Notes
                </button>
              )}
            </div>

            <div className="chat-area">
              {chatMessages.length === 0 ? (
                <div className="chat-empty">
                  <div className="empty-animation">
                    <Lottie animationData={aiAnimation} style={{ width: 200, height: 200 }} />
                  </div>
                  <h3>Start a conversation</h3>
                  <p>Ask me anything or select notes for context-based questions</p>
                </div>
              ) : (
                <div className="messages-container">
                  <AnimatePresence>
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        className={`message ${message.type}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {message.type === 'user' ? (
                          <div className="message-content user-message">
                            {message.content}
                          </div>
                        ) : (
                          <div className="ai-response">
                            {message.content}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isTyping && (
                    <motion.div
                      className="typing-message"
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

            {selectedNotes.length > 0 && (
              <div className="selected-notes">
                <h4>Selected Notes ({selectedNotes.length})</h4>
                <div className="notes-chips">
                  {selectedNotes.map(note => (
                    <div key={note.id} className="note-chip">
                      <span>{note.title}</span>
                      <button onClick={() => handleNoteSelection(note)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-input-area">
              <div className="input-container">
                <button
                  className="context-button"
                  onClick={() => {
                    console.log('Plus button clicked in AI page');
                    setShowNotesModal(true);
                  }}
                  title="Add notes context"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="ai-input"
                />
                <button
                  className="send-button"
                  onClick={() => handleSendMessage()}
                  disabled={!currentMessage.trim() || sendMessageMutation.isPending}
                  title="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Name Modal */}
        {showChatNameModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowChatNameModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="create-modal"
            >
              <div className="modal-header">
                <h3>Create New Chat</h3>
                <button className="close-button" onClick={() => setShowChatNameModal(false)}>×</button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateChat(); }} className="modal-form">
                <input
                  type="text"
                  placeholder="Enter chat name..."
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <Button type="submit">
                    Create
                  </Button>
                  <Button variant="secondary" onClick={() => setShowChatNameModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}

        {/* Notes Selection Modal */}
        {showNotesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowNotesModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="notes-modal"
            >
              <div className="modal-header">
                <h3>Select Notes for Context</h3>
                <button className="close-button" onClick={() => setShowNotesModal(false)}>×</button>
              </div>
              <div className="modal-body">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className={`note-option ${selectedNotes.find(n => n.id === note.id) ? 'selected' : ''}`}
                    onClick={() => handleNoteSelection(note)}
                  >
                    <div className="note-checkbox">
                      {selectedNotes.find(n => n.id === note.id) && '✓'}
                    </div>
                    <div className="note-details">
                      <h4>{note.title}</h4>
                      <p>{note.content && typeof note.content === 'string' ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'No content'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <Button onClick={() => setShowNotesModal(false)}>
                  Done ({selectedNotes.length} selected)
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}