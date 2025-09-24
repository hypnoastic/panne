import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import SectionLoader from '../components/SectionLoader';

import calendarAnimation from '../assets/calendar.json';
import './CalendarPage.css';

// Calendar Events API
const API_BASE_URL = import.meta.env.VITE_API_URL;

const calendarEventsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  create: async (event) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(event)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}/trash`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    time: '',
    date: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: calendarEventsApi.getAll
  });

  const createEventMutation = useMutation({
    mutationFn: calendarEventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setIsCreatingEvent(false);
      setNewEvent({ title: '', description: '', time: '', date: '' });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: calendarEventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  });

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return { days, firstDay, lastDay };
  }, [currentDate]);

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Handle navigation from dashboard
  useEffect(() => {
    if (location.state?.selectedDate) {
      const date = new Date(location.state.selectedDate);
      setSelectedDate(date);
      setCurrentDate(new Date(date.getFullYear(), date.getMonth()));
    }
  }, [location.state]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = () => {
    if (newEvent.title.trim() && selectedDate) {
      createEventMutation.mutate({
        ...newEvent,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="calendarpage-page">
        <div className="calendarpage-container">
          <div className="calendarpage-header">
            <h1>Calendar</h1>
          </div>

          <div className="calendarpage-layout">
            {/* Left Side - Calendar */}
            <div className="calendarpage-section">
              <div className="calendarpage-nav">
                <motion.button 
                  onClick={handlePrevMonth} 
                  className="calendarpage-nav-arrow"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ‹
                </motion.button>
                <h2 className="calendarpage-month-year">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <motion.button 
                  onClick={handleNextMonth} 
                  className="calendarpage-nav-arrow"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ›
                </motion.button>
              </div>

              <div className="calendarpage-grid">
                <div className="calendarpage-days-header">
                  {DAYS.map(day => (
                    <div key={day} className="calendarpage-day-header">{day}</div>
                  ))}
                </div>

                <div className="calendarpage-days">
                  {calendarData.days.map((date, index) => {
                    const dayEvents = getEventsForDate(date);
                    return (
                      <motion.div
                        key={index}
                        className={`calendarpage-day ${
                          !isCurrentMonth(date) ? 'calendarpage-other-month' : ''
                        } ${isToday(date) ? 'calendarpage-today' : ''} ${
                          isSelected(date) ? 'calendarpage-selected' : ''
                        }`}
                        onClick={() => handleDateClick(date)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="calendarpage-day-number">{date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="calendarpage-event-indicators">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={i} className="calendarpage-event-dot" />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="calendarpage-more-events">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side - Selected Date Events */}
            <div className="calendarpage-events-sidebar">
              {selectedDate ? (
                <div className="calendarpage-selected-date-section">
                  <div className="calendarpage-selected-date-header">
                    <h3>{selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</h3>
                    <button
                      className="calendarpage-add-event-button"
                      onClick={() => setIsCreatingEvent(true)}
                    >
                      +
                    </button>
                  </div>

                  {isCreatingEvent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="calendarpage-create-event-form"
                    >
                      <input
                        type="text"
                        placeholder="Event title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="calendarpage-event-input"
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="calendarpage-event-textarea"
                        rows="3"
                      />
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="calendarpage-event-input"
                      />
                      <div className="calendarpage-form-actions">
                        <button 
                          className="calendarpage-create-button"
                          onClick={handleCreateEvent} 
                          disabled={createEventMutation.isPending}
                        >
                          {createEventMutation.isPending ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          className="calendarpage-cancel-button"
                          onClick={() => {
                            setIsCreatingEvent(false);
                            setNewEvent({ title: '', description: '', time: '', date: '' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="calendarpage-events-list">
                    <AnimatePresence>
                      {selectedDateEvents.length > 0 ? (
                        selectedDateEvents.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="calendarpage-event-item"
                          >
                            <div className="calendarpage-event-content">
                              <h4 className="calendarpage-event-title">{event.title || event.name}</h4>
                              {event.time && (
                                <span className="calendarpage-event-time">{event.time}</span>
                              )}
                              {event.description && (
                                <p className="calendarpage-event-description">{event.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setEventToDelete(event);
                                setShowDeleteModal(true);
                              }}
                              className="calendarpage-delete-button"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="calendarpage-no-events">
                          <p>No events scheduled for this date</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="calendarpage-no-date-selected">
                  <div className="calendarpage-placeholder-content">
                    <Lottie 
                      animationData={calendarAnimation} 
                      style={{ width: 300, height: 300 }} 
                      loop={true}
                    />
                    <h3>Select a date</h3>
                    <p>Click on a date to view and manage events</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Event Modal */}
        {showDeleteModal && eventToDelete && (
          <div className="calendarpage-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="calendarpage-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="calendarpage-modal-header">
                <h3>Delete Event</h3>
                <button 
                  className="calendarpage-modal-close" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="calendarpage-modal-content">
                <p className="calendarpage-delete-message">
                  Are you sure you want to move "{eventToDelete.title || eventToDelete.name}" to trash?
                </p>
                <div className="calendarpage-modal-actions">
                  <button 
                    className="calendarpage-confirm-delete"
                    onClick={() => deleteEventMutation.mutate(eventToDelete.id)}
                    disabled={deleteEventMutation.isPending}
                  >
                    {deleteEventMutation.isPending ? 'Moving to Trash...' : 'Move to Trash'}
                  </button>
                  <button
                    className="calendarpage-cancel-delete"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setEventToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}