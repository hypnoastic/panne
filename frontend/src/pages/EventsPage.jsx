import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import eventsAnimation from '../assets/events.json';
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
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll
  });

  const { data: currentTask } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.getById(taskId),
    enabled: !!taskId
  });

  const { data: todoItems = [] } = useQuery({
    queryKey: ['todoItems', taskId],
    queryFn: () => todoItemsApi.getByTaskId(taskId),
    enabled: !!taskId
  });

  const createEventMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setIsCreatingEvent(false);
      setNewEventName('');
    }
  });

  const createTodoMutation = useMutation({
    mutationFn: todoItemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['todoItems', taskId]);
    }
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, ...data }) => todoItemsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['todoItems', taskId]);
    }
  });

  const handleCreateEvent = () => {
    if (newEventName.trim()) {
      createEventMutation.mutate({
        name: newEventName.trim()
      });
    }
  };

  const handleAddTodo = (text) => {
    if (text.trim()) {
      createTodoMutation.mutate({
        task_id: taskId,
        text: text.trim()
      });
    }
  };

  return (
    <AppLayout>
      <div className="events-page">
        <div className="events-layout">
          {/* Events Sidebar */}
          <div className="events-sidebar">
            <div className="sidebar-header">
              <h3>Events</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingEvent(true)}
              >
                +
              </Button>
            </div>

            {isCreatingEvent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="create-event"
              >
                <input
                  type="text"
                  placeholder="Event name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="create-event__input"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateEvent()}
                />
                <div className="create-event__actions">
                  <Button size="sm" onClick={handleCreateEvent}>
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingEvent(false);
                      setNewEventName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="events-list">
              {events.map((event) => {
                const eventTasks = tasks.filter(task => task.event_id === event.id);
                return (
                  <div key={event.id} className="event-group">
                    <button
                      className={`event-item ${expandedEvent === event.id ? 'event-item--expanded' : ''}`}
                      onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    >
                      <span>{event.name}</span>
                      <span className="event-count">{eventTasks.length}</span>
                    </button>
                    {expandedEvent === event.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="event-tasks"
                      >
                        {eventTasks.map((task) => (
                          <Link
                            key={task.id}
                            to={`/events/${task.id}`}
                            className={`task-link ${taskId === task.id ? 'task-link--active' : ''}`}
                          >
                            {task.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Editor */}
          <div className="events-editor">
            {currentTask ? (
              <div className="editor-container">
                <div className="editor-header">
                  <h2 className="editor-title">{currentTask.title}</h2>
                </div>

                <div className="todo-section">
                  <div className="todo-list">
                    {todoItems.map((item) => (
                      <div key={item.id} className="todo-item">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => updateTodoMutation.mutate({
                            id: item.id,
                            text: item.text,
                            completed: e.target.checked
                          })}
                        />
                        <span className={item.completed ? 'completed' : ''}>{item.text}</span>
                      </div>
                    ))}
                    <input
                      type="text"
                      placeholder="Add todo item..."
                      className="add-todo-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTodo(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="editor-empty">
                <div className="empty-state">
                  <div className="empty-state__image">
                    <Lottie animationData={eventsAnimation} style={{ width: 200, height: 150 }} />
                  </div>
                  <h4 className="empty-state__title">Select a task to start editing</h4>
                  <p className="empty-state__description">
                    Choose a task from an event to manage your todos
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}