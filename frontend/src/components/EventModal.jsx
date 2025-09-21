import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import './EventModal.css';

export default function EventModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedDate,
  loading = false 
}) {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    time: '09:00'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (eventData.title.trim()) {
      onSubmit({
        ...eventData,
        date: selectedDate
      });
      setEventData({ title: '', description: '', time: '09:00' });
    }
  };

  const handleClose = () => {
    setEventData({ title: '', description: '', time: '09:00' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="event-modal"
          >
            <div className="modal-header">
              <h3>Create Event</h3>
              <button className="close-button" onClick={handleClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  placeholder="Enter event title..."
                  value={eventData.title}
                  onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                  className="modal-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Enter event description..."
                  value={eventData.description}
                  onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                  className="modal-textarea"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={eventData.time}
                  onChange={(e) => setEventData(prev => ({ ...prev, time: e.target.value }))}
                  className="modal-input"
                />
              </div>
              <div className="modal-actions">
                <Button type="submit" loading={loading}>
                  Create Event
                </Button>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}