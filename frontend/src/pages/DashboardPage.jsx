import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import { authApi, notesApi } from '../services/api';
import aiAnimation from '../assets/ai.json';
import helloAnimation from '../assets/hello.json';
import './DashboardPage.css';

// AI Chat API
const API_BASE_URL = import.meta.env.VITE_API_URL;

const aiChatApi = {
  sendMessage: async (message) => {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
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
    const response = await fetch(`${API_BASE_URL}/ai/format-note`, {
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
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser
  });

  if (userLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  // Real data queries
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  // Get upcoming events from backend
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/events`, {
          credentials: 'include'
        });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    }
  });
  
  const today = new Date();
  const upcomingEvents = calendarEvents
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 2);
  
  // Real tasks data
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
          credentials: 'include'
        });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    }
  });
  
  // Agendas data
  const { data: agendas = [] } = useQuery({
    queryKey: ['agendas'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/agendas`, {
          credentials: 'include'
        });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    }
  });
  
  const upcomingAgendas = agendas.slice(0, 2);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleFormatToNote = () => {
    if (chatMessages.length > 0) {
      formatToNoteMutation.mutate(chatMessages);
    }
  };

  const handleAISubmit = () => {
    if (currentMessage.trim()) {
      navigate('/ai', { state: { initialMessage: currentMessage, selectedNotes } });
      setCurrentMessage('');
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

  return (
    <AppLayout>
      <div className="dashboardpage-main">
        <div className="dashboardpage-container">
          {/* Welcome Text */}
          <div className="dashboardpage-welcome-header">
            <h1>{getGreeting()}, {user?.name || 'User'}!</h1>
          </div>

          {/* Modern AI Input Section */}
          <div className="dashboardpage-ai-input-section">
            <div className="dashboardpage-ai-input-container">
              <button className="dashboardpage-ai-plus-btn" onClick={() => {
                navigate('/ai', { state: { openNotesModal: true } });
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask AI anything..."
                className="dashboardpage-ai-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAISubmit()}
              />
              <button className="dashboardpage-ai-send-btn" onClick={handleAISubmit} disabled={!currentMessage.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                </svg>
              </button>
            </div>
          </div>

          {/* Date Display */}
          <div className="dashboardpage-date-display">
            <span>{today.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {/* Dashboard Content Container */}
          <div className="dashboardpage-content-container">
            <div className="dashboardpage-content">
            {/* Left Column - Events & Tasks */}
            <div className="dashboardpage-left">
              <div className="dashboardpage-section">
                <h2>Upcoming Events</h2>
                <div className="dashboardpage-events-list">
                  {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="dashboardpage-event-item"
                      onClick={() => {
                        const eventDate = new Date(event.date);
                        navigate('/calendar', { state: { selectedDate: eventDate, selectedEventId: event.id } });
                      }}
                    >
                      <div className="dashboardpage-event-dot"></div>
                      <div className="dashboardpage-event-info">
                        <h4>{event.title}</h4>
                        <span>{new Date(event.date).toLocaleDateString()} - {event.time || 'All day'}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="dashboardpage-empty-state">No upcoming events</div>
                  )}
                </div>
              </div>



              <div className="dashboardpage-section">
                <h2>Upcoming Agendas</h2>
                <div className="dashboardpage-agendas-list">
                  {upcomingAgendas.length > 0 ? upcomingAgendas.map(agenda => {
                    const agendaTasks = tasks.filter(task => task.agenda_id === agenda.id);
                    const completedTasks = agendaTasks.filter(task => task.completed).length;
                    const totalTasks = agendaTasks.length;
                    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    
                    return (
                      <div 
                        key={agenda.id} 
                        className="dashboardpage-agenda-item"
                        onClick={() => navigate('/agenda', { state: { selectedAgendaId: agenda.id } })}
                      >
                        <div className="dashboardpage-agenda-info">
                          <span className="dashboardpage-agenda-name">{agenda.name}</span>
                          <span className="dashboardpage-agenda-tasks">{completedTasks}/{totalTasks} tasks</span>
                        </div>
                        <div className="dashboardpage-progress-circle">
                          <svg width="40" height="40" className="dashboardpage-progress-ring">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.1)"
                              strokeWidth="3"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              stroke="#2EC4B6"
                              strokeWidth="3"
                              strokeDasharray={`${2 * Math.PI * 16}`}
                              strokeDashoffset={`${2 * Math.PI * 16 * (1 - completionPercentage / 100)}`}
                              transform="rotate(-90 20 20)"
                              className="dashboardpage-progress-circle"
                            />
                          </svg>
                          <span className="dashboardpage-progress-text">{Math.round(completionPercentage)}%</span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="dashboardpage-empty-state">No agendas yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Recent Notes */}
            <div className="dashboardpage-right">
              <div className="dashboardpage-section">
                <h2>Recent Notes</h2>
                <div className="dashboardpage-notes-list">
                  {recentNotes.slice(0, 3).map(note => (
                    <div key={note.id} className="dashboardpage-note-item" onClick={() => navigate(`/notes/${note.id}`)}>
                      <h4>{note.title}</h4>
                      <p>{note.preview}</p>
                      <span className="dashboardpage-note-date">{note.updatedAt}</span>
                    </div>
                  ))}
                  {recentNotes.length === 0 && (
                    <div className="dashboardpage-empty-state">No notes yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Notes Selection Modal */}
        {showNotesModal && (
          <div className="dashboardpage-modal-overlay" onClick={() => setShowNotesModal(false)}>
            <div className="dashboardpage-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="dashboardpage-modal-header">
                <h3>Select Notes for Context</h3>
                <button onClick={() => setShowNotesModal(false)}>×</button>
              </div>
              <div className="dashboardpage-modal-body">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className={`dashboardpage-note-option ${selectedNotes.find(n => n.id === note.id) ? 'dashboardpage-selected' : ''}`}
                    onClick={() => handleNoteSelection(note)}
                  >
                    <div className="dashboardpage-note-checkbox">
                      {selectedNotes.find(n => n.id === note.id) && '✓'}
                    </div>
                    <div className="dashboardpage-note-details">
                      <h4>{note.title}</h4>
                      <p>{note.content && typeof note.content === 'string' ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'No content'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dashboardpage-modal-footer">
                <Button onClick={() => setShowNotesModal(false)}>
                  Done ({selectedNotes.length} selected)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
