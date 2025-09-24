import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import './EventsPage.css';

// API calls
const eventsApi = {
  getAll: async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/events`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },
  create: async (event) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/events`, {
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/tasks`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
  getById: async (id) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  }
};

const todoItemsApi = {
  getByTaskId: async (taskId) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}/todos`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  },
  create: async (item) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  },
  update: async (id, updates) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/todos/${id}`, {
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: events = [], isLoading, error: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
    retry: 1
  });

  const { data: tasks = [], error: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll,
    retry: 1
  });

  if (eventsError || tasksError) {
    return (
      <AppLayout>
        <div className="events-page">
          <div className="events-container">
            <div className="eventspage-error-state">
              <h3>Error loading data</h3>
              <p>Please try refreshing the page</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
    (event.title || event.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle navigation from dashboard to specific task
  useEffect(() => {
    try {
      if (location.state?.selectedTaskId && tasks.length > 0 && events.length > 0) {
        const selectedTask = tasks.find(task => task.id === location.state.selectedTaskId);
        if (selectedTask) {
          // Find and expand the event containing this task
          const parentEvent = events.find(event => 
            tasks.some(task => task.event_id === event.id && task.id === selectedTask.id)
          );
          if (parentEvent) {
            setExpandedEvent(parentEvent.id);
          }
        }
      }
    } catch (error) {
      console.error('Error handling task navigation:', error);
    }
  }, [location.state, tasks, events]);

  if (isLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="eventspage-page">
        <div className="eventspage-container">
          <div className="eventspage-header">
            <h1 className="font-h1">Events</h1>
            <div className="eventspage-header-actions">
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="eventspage-search-input"
              />
              <button className="eventspage-plus-icon" onClick={() => setIsCreating(true)}>
                +
              </button>
            </div>
          </div>

          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="eventspage-create-event-form"
            >
              <input
                type="text"
                placeholder="Event name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="eventspage-event-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateEvent()}
                autoFocus
              />
              <div className="eventspage-form-actions">
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

          <div className="eventspage-events-list">
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
                    className="eventspage-event-container"
                  >
                    <div 
                      className="eventspage-event-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEvent(isExpanded ? null : event.id);
                      }}
                    >
                      <div className="eventspage-event-header">
                        <div className="eventspage-event-info">
                          <h3 className="eventspage-event-title">{event.title || event.name}</h3>
                          <p className="eventspage-event-meta">
                            {eventTasks.length} tasks
                          </p>
                        </div>
                        <div className={`eventspage-expand-icon ${isExpanded ? 'eventspage-expanded' : ''}`}>▼</div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="eventspage-tasks-grid"
                      >
                        {eventTasks.length > 0 ? (
                          eventTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              className="eventspage-task-card"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4 className="eventspage-task-title">{task.title}</h4>
                              <p className="eventspage-task-preview">
                                {task.description 
                                  ? task.description.substring(0, 80) + '...' 
                                  : 'No description'
                                }
                              </p>
                              <span className="eventspage-task-date">
                                {new Date(task.updated_at).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))
                        ) : (
                          <div className="eventspage-empty-tasks">
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
            <div className="eventspage-empty-state">
              <h3 className="eventspage-empty-state__title">No events yet</h3>
              <p className="eventspage-empty-state__description">
                Create your first event to organize your tasks
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}