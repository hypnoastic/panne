import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import './CalendarPage.css';

// Mock API for events (replace with real API later)
const eventsApi = {
  getAll: () => Promise.resolve([]),
  create: (event) => Promise.resolve({ id: Date.now(), ...event }),
  update: (id, updates) => Promise.resolve({ id, ...updates }),
  delete: (id) => Promise.resolve({ id })
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', description: '' });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll
  });

  const createEventMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setShowEventModal(false);
      setNewEvent({ title: '', time: '', description: '' });
    }
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    if (newEvent.title.trim() && selectedDate) {
      createEventMutation.mutate({
        ...newEvent,
        date: selectedDate.toISOString().split('T')[0]
      });
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <AppLayout>
      <div className="calendar-page">
        <div className="calendar-header">
          <h1 className="font-h1">Calendar</h1>
          <div className="calendar-nav">
            <Button variant="ghost" onClick={() => navigateMonth(-1)}>←</Button>
            <h2 className="current-month">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="ghost" onClick={() => navigateMonth(1)}>→</Button>
          </div>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {dayNames.map(day => (
              <div key={day} className="weekday-header font-label">
                {day}
              </div>
            ))}
          </div>
          
          <div className="calendar-days">
            {days.map((date, index) => (
              <div
                key={index}
                className={`calendar-day ${date ? 'calendar-day--clickable' : ''} ${
                  date && date.toDateString() === new Date().toDateString() ? 'calendar-day--today' : ''
                }`}
                onClick={() => date && handleDateClick(date)}
              >
                {date && (
                  <>
                    <span className="day-number">{date.getDate()}</span>
                    <div className="day-events">
                      {events
                        .filter(event => event.date === date.toISOString().split('T')[0])
                        .slice(0, 2)
                        .map(event => (
                          <div key={event.id} className="event-dot" title={event.title} />
                        ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Event Modal */}
        <AnimatePresence>
          {showEventModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowEventModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="event-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>Add Event</h3>
                  <p className="font-meta">
                    {selectedDate?.toLocaleDateString()}
                  </p>
                </div>
                
                <div className="modal-content">
                  <div className="form-group">
                    <label className="font-label">Event Title</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                      placeholder="Enter event title"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="font-label">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="font-label">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      className="form-input"
                      rows={3}
                      placeholder="Event description (optional)"
                    />
                  </div>
                </div>
                
                <div className="modal-actions">
                  <Button onClick={handleCreateEvent} loading={createEventMutation.isPending}>
                    Add Event
                  </Button>
                  <Button variant="secondary" onClick={() => setShowEventModal(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}