import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';

import sectionLoader from '../assets/section_loader.json';
import calendarAnimation from '../assets/calendar.json';
import './CalendarPage.css';

// Calendar Events API
const calendarEventsApi = {
  getAll: async () => {
    const response = await fetch('http://localhost:5000/api/events', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  create: async (event) => {
    const response = await fetch('http://localhost:5000/api/events', {
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
    const response = await fetch(`http://localhost:5000/api/events/${id}`, {
      method: 'DELETE',
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
        <div className="calendar-loading">
          <Lottie animationData={sectionLoader} style={{ width: 400, height: 400 }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="calendar-page">
        <div className="calendar-container">
          <div className="calendar-header">
            <h1>Calendar</h1>
          </div>

          <div className="calendar-layout">
            {/* Left Side - Calendar */}
            <div className="calendar-section">
              <div className="calendar-nav">
                <motion.button 
                  onClick={handlePrevMonth} 
                  className="nav-arrow"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ‹
                </motion.button>
                <h2 className="month-year">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <motion.button 
                  onClick={handleNextMonth} 
                  className="nav-arrow"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ›
                </motion.button>
              </div>

              <div className="calendar-grid">
                <div className="calendar-days-header">
                  {DAYS.map(day => (
                    <div key={day} className="day-header">{day}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {calendarData.days.map((date, index) => {
                    const dayEvents = getEventsForDate(date);
                    return (
                      <motion.div
                        key={index}
                        className={`calendar-day ${
                          !isCurrentMonth(date) ? 'other-month' : ''
                        } ${isToday(date) ? 'today' : ''} ${
                          isSelected(date) ? 'selected' : ''
                        }`}
                        onClick={() => handleDateClick(date)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="day-number">{date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="event-indicators">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={i} className="event-dot" />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="more-events">+{dayEvents.length - 3}</span>
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
            <div className="events-sidebar">
              {selectedDate ? (
                <div className="selected-date-section">
                  <div className="selected-date-header">
                    <h3>{selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</h3>
                    <button
                      className="add-event-button"
                      onClick={() => setIsCreatingEvent(true)}
                    >
                      +
                    </button>
                  </div>

                  {isCreatingEvent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="create-event-form"
                    >
                      <input
                        type="text"
                        placeholder="Event title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="event-input"
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="event-textarea"
                        rows="3"
                      />
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="event-input"
                      />
                      <div className="form-actions">
                        <button 
                          className="create-button"
                          onClick={handleCreateEvent} 
                          disabled={createEventMutation.isPending}
                        >
                          {createEventMutation.isPending ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          className="cancel-button"
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

                  <div className="events-list">
                    <AnimatePresence>
                      {selectedDateEvents.length > 0 ? (
                        selectedDateEvents.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="calendar-event-item"
                          >
                            <div className="event-content">
                              <h4 className="event-title">{event.title || event.name}</h4>
                              {event.time && (
                                <span className="event-time">{event.time}</span>
                              )}
                              {event.description && (
                                <p className="event-description">{event.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteEventMutation.mutate(event.id)}
                              className="delete-button"
                            >
                              ×
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="no-events">
                          <p>No events scheduled for this date</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="no-date-selected">
                  <div className="placeholder-content">
                    <Lottie 
                      animationData={calendarAnimation} 
                      style={{ width: 200, height: 200 }} 
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
      </div>
    </AppLayout>
  );
}