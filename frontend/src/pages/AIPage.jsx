import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import { notesApi } from '../services/api';
import aiAnimation from '../assets/ai.json';
import './AIPage.css';

// AI Chat API
const aiChatApi = {
  sendMessage: async (message, context = [], chatId = null) => {
    const response = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ message, context, chatId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  },
  exportToNote: async (chatId, selectedNotes = []) => {
    const response = await fetch('http://localhost:5000/api/ai/export-to-note', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ chatId, selectedNotes })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  },
  saveChat: async (chatData) => {
    const response = await fetch('http://localhost:5000/api/ai/chats', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(chatData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  getChats: async () => {
    const response = await fetch('http://localhost:5000/api/ai/chats', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  deleteChat: async (chatId) => {
    const response = await fetch(`http://localhost:5000/api/ai/chats/${chatId}/trash`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
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
  const [tempSelectedNotes, setTempSelectedNotes] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatNameModal, setShowChatNameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [newChatName, setNewChatName] = useState('');

  // Load chats on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chatsData = await aiChatApi.getChats();
        setChats(chatsData);
        if (chatsData.length > 0) {
          setCurrentChatId(chatsData[0].id);
          setChatMessages(chatsData[0].messages || []);
        }
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    };
    loadChats();
  }, []);

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
    
    // Handle opening notes modal from dashboard
    if (location.state?.openNotesModal) {
      setTempSelectedNotes(selectedNotes);
      setShowNotesModal(true);
      // Clear the state to prevent reopening
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  // Update messages when chat changes
  useEffect(() => {
    if (currentChatId) {
      const currentChat = chats.find(chat => chat.id === currentChatId);
      if (currentChat) {
        setChatMessages(currentChat.messages || []);
      }
    }
  }, [currentChatId, chats]);

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, context, chatId }) => aiChatApi.sendMessage(message, context, chatId),
    onMutate: () => {
      setIsTyping(true);
      setChatMessages(prev => [...prev, { type: 'user', content: currentMessage }]);
    },
    onSuccess: async (response) => {
      setChatMessages(prev => [...prev, { type: 'ai', content: response.message }]);
      setCurrentMessage('');
      setIsTyping(false);
      // Reload chats to get updated messages
      try {
        const chatsData = await aiChatApi.getChats();
        setChats(chatsData);
      } catch (error) {
        console.error('Failed to reload chats:', error);
      }
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
    mutationFn: ({ chatId, selectedNotes }) => aiChatApi.exportToNote(chatId, selectedNotes),
    onSuccess: () => {
      navigate('/notes');
    },
    onError: (error) => {
      console.error('Export note error:', error);
    }
  });

  const handleSendMessage = async (message = currentMessage, notes = selectedNotes) => {
    if (message.trim()) {
      // Create new chat if none exists
      if (!currentChatId) {
        try {
          const chatTitle = message.length > 30 ? message.substring(0, 30) + '...' : message;
          const newChat = await aiChatApi.saveChat({ title: chatTitle, messages: [] });
          setChats(prev => [newChat, ...prev]);
          setCurrentChatId(newChat.id);
        } catch (error) {
          console.error('Failed to create chat:', error);
          return;
        }
      }
      
      const context = notes.map(note => ({
        title: note.title,
        content: typeof note.content === 'string' ? note.content : JSON.stringify(note.content)
      }));
      sendMessageMutation.mutate({ message, context, chatId: currentChatId });
    }
  };

  const handleNoteSelection = (note) => {
    setTempSelectedNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) {
        return prev.filter(n => n.id !== note.id);
      } else {
        return [...prev, note];
      }
    });
  };

  const handleDoneSelection = () => {
    setSelectedNotes(tempSelectedNotes);
    setShowNotesModal(false);
  };

  const handleCancelSelection = () => {
    setTempSelectedNotes(selectedNotes);
    setShowNotesModal(false);
  };

  const handleRemoveNote = (noteToRemove) => {
    setSelectedNotes(prev => prev.filter(note => note.id !== noteToRemove.id));
  };

  const handleExportToNote = () => {
    if (currentChatId && chatMessages.length > 0) {
      exportToNoteMutation.mutate({ chatId: currentChatId, selectedNotes });
    }
  };

  const createNewChat = () => {
    setShowChatNameModal(true);
  };

  const handleCreateChat = async () => {
    try {
      const chatTitle = newChatName.trim() || 'New Chat';
      const newChat = await aiChatApi.saveChat({ title: chatTitle, messages: [] });
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setChatMessages([]);
      setSelectedNotes([]);
      setShowChatNameModal(false);
      setNewChatName('');
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const deleteChatMutation = useMutation({
    mutationFn: aiChatApi.deleteChat,
    onSuccess: () => {
      // Reload chats after deletion
      const loadChats = async () => {
        try {
          const chatsData = await aiChatApi.getChats();
          setChats(chatsData);
          // If current chat was deleted, switch to first available chat or clear
          if (chatsData.length > 0) {
            setCurrentChatId(chatsData[0].id);
            setChatMessages(chatsData[0].messages || []);
          } else {
            setCurrentChatId(null);
            setChatMessages([]);
          }
        } catch (error) {
          console.error('Failed to reload chats:', error);
        }
      };
      loadChats();
    }
  });

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete);
      setShowDeleteModal(false);
      setChatToDelete(null);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (notesLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="aipage-container">
        <div className="aipage-layout">
          {/* Left Sidebar - Chat History */}
          <div className="aipage-sidebar">
            <div className="aipage-sidebar-header">
              <div className="aipage-chat-title">Chat</div>
              <button className="aipage-plus-icon" onClick={createNewChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            
            <div className="aipage-search-chats">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="aipage-search-input"
              />
            </div>

            <div className="aipage-chats-list">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`aipage-chat-item ${currentChatId === chat.id ? 'aipage-active' : ''}`}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                    setChatMessages(chat.messages || []);
                  }}
                >
                  <span>{chat.title}</span>
                  <button
                    className="aipage-delete-chat"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    title="Delete chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Chat Area */}
          <div className="aipage-main">
            <div className="aipage-header">
              <h1>PanneAI</h1>
              {chatMessages.length > 0 && (
                <button 
                  className="aipage-export-btn" 
                  onClick={handleExportToNote}
                  disabled={exportToNoteMutation.isPending}
                >
                  {exportToNoteMutation.isPending ? (
                    <div className="aipage-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                    </svg>
                  )}
                  {exportToNoteMutation.isPending ? 'Exporting...' : 'Export to Notes'}
                </button>
              )}
            </div>

            <div className="aipage-chat-area">
              {chatMessages.length === 0 ? (
                <div className="aipage-chat-empty">
                  <div className="aipage-empty-animation">
                    <Lottie animationData={aiAnimation} style={{ width: 400, height: 400 }} loop={true} />
                  </div>
                  <h3>Start a conversation</h3>
                  <p>Ask me anything or select notes for context-based questions</p>
                </div>
              ) : (
                <div className="aipage-messages-container">
                  <AnimatePresence>
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        className={`aipage-message ${message.type}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {message.type === 'user' ? (
                          <div className="aipage-message-content aipage-user-message">
                            {message.content}
                          </div>
                        ) : (
                          <div className="aipage-ai-response">
                            {message.content}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isTyping && (
                    <motion.div
                      className="aipage-typing-message"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="aipage-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="aipage-input-area">
              {selectedNotes.length > 0 && (
                <div className="aipage-selected-notes-outside">
                  {selectedNotes.map(note => (
                    <div key={note.id} className="aipage-note-chip-inline">
                      <span>{note.title}</span>
                      <button onClick={() => handleRemoveNote(note)}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="aipage-input-container">
                <button
                  className="aipage-context-button"
                  onClick={() => {
                    console.log('Plus button clicked in AI page');
                    setTempSelectedNotes(selectedNotes);
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
                  className="aipage-input"
                />
                <button
                  className="aipage-send-button"
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
          <div className="aipage-modal-overlay" onClick={() => setShowChatNameModal(false)}>
            <div className="aipage-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="aipage-modal-header">
                <h3>Create New Chat</h3>
                <button className="aipage-close-button" onClick={() => setShowChatNameModal(false)}>×</button>
              </div>
              <div className="aipage-modal-content">
                <form onSubmit={(e) => { e.preventDefault(); handleCreateChat(); }} className="aipage-modal-form">
                  <input
                    type="text"
                    placeholder="Enter chat name..."
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="aipage-modal-input"
                    autoFocus
                  />
                  <div className="aipage-modal-actions">
                    <Button type="submit">
                      Create
                    </Button>
                    <Button variant="secondary" onClick={() => setShowChatNameModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Notes Selection Modal */}
        {showNotesModal && (
          <div className="aipage-modal-overlay" onClick={() => setShowNotesModal(false)}>
            <div className="aipage-notes-modal" onClick={(e) => e.stopPropagation()}>
              <div className="aipage-modal-header">
                <h3>Select Notes for Context</h3>
                <button className="aipage-close-button" onClick={() => setShowNotesModal(false)}>×</button>
              </div>
              <div className="aipage-modal-content">
                <div className="aipage-modal-body">
                  {notes.map(note => (
                    <div
                      key={note.id}
                      className={`aipage-note-option ${tempSelectedNotes.find(n => n.id === note.id) ? 'aipage-selected' : ''}`}
                      onClick={() => handleNoteSelection(note)}
                    >
                      <div className="aipage-note-checkbox">
                        {tempSelectedNotes.find(n => n.id === note.id) && '✓'}
                      </div>
                      <div className="aipage-note-details">
                        <h4>{note.title}</h4>
                        <p>{note.content && typeof note.content === 'string' ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'No content'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="aipage-modal-actions">
                  <Button onClick={handleDoneSelection}>
                    Done ({tempSelectedNotes.length} selected)
                  </Button>
                  <Button variant="secondary" onClick={handleCancelSelection}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="aipage-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="aipage-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="aipage-modal-header">
                <h3>Delete Chat</h3>
                <button className="aipage-close-button" onClick={() => setShowDeleteModal(false)}>×</button>
              </div>
              <div className="aipage-modal-content">
                <p className="aipage-delete-message">
                  Are you sure you want to move this chat to trash?
                </p>
                <div className="aipage-modal-actions">
                  <Button onClick={confirmDeleteChat} disabled={deleteChatMutation.isPending}>
                    {deleteChatMutation.isPending ? 'Moving to Trash...' : 'Move to Trash'}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}