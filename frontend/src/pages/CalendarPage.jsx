import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import './CalendarPage.css';

// Calendar Events API
const calendarEventsApi = {
  getAll: async () => {
    const response = await fetch('http://localhost:5000/api/calendar-events', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch calendar events');
    return response.json();
  },
  create: async (event) => {
    const response = await fetch('http://localhost:5000/api/calendar-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(event)
    });
    if (!response.ok) throw new Error('Failed to create calendar event');
    return response.json();
  },
  update: async (id, event) => {
    const response = await fetch(`http://localhost:5000/api/calendar-events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(event)
    });
    if (!response.ok) throw new Error('Failed to update calendar event');
    return response.json();
  },
  delete: async (id) => {
    const response = await fetch(`http://localhost:5000/api/calendar-events/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete calendar event');
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
    queryKey: ['calendar-events'],
    queryFn: calendarEventsApi.getAll
  });

  const createEventMutation = useMutation({
    mutationFn: calendarEventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
      setIsCreatingEvent(false);
      setNewEvent({ title: '', description: '', time: '', date: '' });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: calendarEventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
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
    return events.filter(event => event.date === dateStr);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

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
          <LoadingSpinner />
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
                <button onClick={handlePrevMonth} className="nav-button">‹</button>
                <h2 className="month-year">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button onClick={handleNextMonth} className="nav-button">›</button>
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
                    <Button
                      size="sm"
                      onClick={() => setIsCreatingEvent(true)}
                    >
                      Add Event
                    </Button>
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
                        <Button onClick={handleCreateEvent} loading={createEventMutation.isPending}>
                          Create
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setIsCreatingEvent(false);
                            setNewEvent({ title: '', description: '', time: '', date: '' });
                          }}
                        >
                          Cancel
                        </Button>
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
                            className="event-item"
                          >
                            <div className="event-content">
                              <h4 className="event-title">{event.title}</h4>
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
                    <div className="placeholder-icon">📅</div>
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