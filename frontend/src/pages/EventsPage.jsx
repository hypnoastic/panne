import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import './EventsPage.css';

// API calls
const eventsApi = {
  getAll: async () => {
    const response = await fetch('http://localhost:5000/api/events', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },
  create: async (event) => {
    const response = await fetch('http://localhost:5000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(event)
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  }
};

const tasksApi = {
  getAll: async () => {
    const response = await fetch('http://localhost:5000/api/tasks', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
  getById: async (id) => {
    const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  }
};

const todoItemsApi = {
  getByTaskId: async (taskId) => {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/todos`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  },
  create: async (item) => {
    const response = await fetch('http://localhost:5000/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  },
  update: async (id, updates) => {
    const response = await fetch(`http://localhost:5000/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update todo');
    return response.json();
  }
};

export default function EventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll
  });

  const createEventMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setIsCreating(false);
      setNewEventName('');
    }
  });

  const handleCreateEvent = () => {
    if (newEventName.trim()) {
      createEventMutation.mutate({
        name: newEventName.trim()
      });
    }
  };

  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="events-loading">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="events-page">
        <div className="events-container">
          <div className="events-header">
            <h1 className="font-h1">Events</h1>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button className="plus-icon" onClick={() => setIsCreating(true)}>
                +
              </button>
            </div>
          </div>

          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="create-event-form"
            >
              <input
                type="text"
                placeholder="Event name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="event-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateEvent()}
                autoFocus
              />
              <div className="form-actions">
                <Button onClick={handleCreateEvent} loading={createEventMutation.isPending}>
                  Create
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setNewEventName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          <div className="events-list">
            <AnimatePresence>
              {filteredEvents.map((event) => {
                const eventTasks = tasks.filter(task => task.event_id === event.id);
                const isExpanded = expandedEvent === event.id;
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="event-container"
                  >
                    <div 
                      className="event-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEvent(isExpanded ? null : event.id);
                      }}
                    >
                      <div className="event-header">
                        <div className="event-info">
                          <h3 className="event-title">{event.name}</h3>
                          <p className="event-meta">
                            {eventTasks.length} tasks
                          </p>
                        </div>
                        <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="tasks-grid"
                      >
                        {eventTasks.length > 0 ? (
                          eventTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              className="task-card"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4 className="task-title">{task.title}</h4>
                              <p className="task-preview">
                                {task.description 
                                  ? task.description.substring(0, 80) + '...' 
                                  : 'No description'
                                }
                              </p>
                              <span className="task-date">
                                {new Date(task.updated_at).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))
                        ) : (
                          <div className="empty-tasks">
                            <p>No tasks in this event</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {events.length === 0 && !isCreating && (
            <div className="empty-state">
              <h3 className="empty-state__title">No events yet</h3>
              <p className="empty-state__description">
                Create your first event to organize your tasks
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}