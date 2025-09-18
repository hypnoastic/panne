import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';

import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import eventsAnimation from '../assets/events.json';
import './TasksPage.css';

// Real API calls to database
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
  },
  update: async (id, updates) => {
    const response = await fetch(`http://localhost:5000/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },
  delete: async (id) => {
    const response = await fetch(`http://localhost:5000/api/events/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete event');
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
  },
  create: async (task) => {
    const response = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  },
  update: async (id, updates) => {
    const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },
  delete: async (id) => {
    const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete task');
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
  },
  delete: async (id) => {
    const response = await fetch(`http://localhost:5000/api/todos/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete todo');
    return response.json();
  }
};

export default function TasksPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll
  });

  const { data: currentTask, isLoading: taskLoading } = useQuery({
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

  const createTaskMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: (newTask) => {
      queryClient.invalidateQueries(['tasks']);
      navigate(`/tasks/${newTask.id}`);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      navigate('/tasks');
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = !selectedEvent || task.event_id === selectedEvent;
    return matchesSearch && matchesEvent;
  });

  const handleCreateEvent = () => {
    if (newEventName.trim()) {
      createEventMutation.mutate({
        name: newEventName.trim()
      });
    }
  };

  const handleCreateTask = () => {
    const taskTitle = newTaskName.trim() || 'Untitled Task';
    createTaskMutation.mutate({
      title: taskTitle,
      content: {},
      event_id: selectedEvent
    });
    setIsCreatingTask(false);
    setNewTaskName('');
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
      <div className="tasks-page">
        <div className="tasks-layout">
          {/* Events Sidebar */}
          <div className="tasks-sidebar">
            <div className="sidebar-header">
              <h3>Events</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingTask(true)}
              >
                + Task
              </Button>
            </div>

            {isCreatingTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="create-event"
              >
                <input
                  type="text"
                  placeholder="Task name"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="create-event__input"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
                />
                <div className="create-event__actions">
                  <Button size="sm" onClick={handleCreateTask}>
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingTask(false);
                      setNewTaskName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="events-list">
              <button
                className={`event-item ${!selectedEvent ? 'event-item--active' : ''}`}
                onClick={() => setSelectedEvent(null)}
              >
                <span>All Tasks</span>
                <span className="event-count">{tasks.length}</span>
              </button>

              {events.map((event) => (
                <button
                  key={event.id}
                  className={`event-item ${selectedEvent === event.id ? 'event-item--active' : ''}`}
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <span>{event.name}</span>
                  <span className="event-count">{event.task_count || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          <div className="tasks-list">
            <div className="tasks-list-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <Button onClick={handleCreateTask} loading={createTaskMutation.isPending}>
                New Task
              </Button>
            </div>

            <div className="tasks-items">
              <AnimatePresence>
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`task-item ${taskId === task.id ? 'task-item--active' : ''}`}
                  >
                    <Link to={`/tasks/${task.id}`} className="task-item__link">
                      <h4 className="task-item__title">{task.title}</h4>
                      <p className="task-item__preview">
                        {task.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                      </p>
                      <div className="task-item__meta">
                        {task.event_name && (
                          <span className="task-item__event">{task.event_name}</span>
                        )}
                        <span className="task-item__date">
                          {new Date(task.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredTasks.length === 0 && (
                <div className="empty-state">
                  <h4 className="empty-state__title">No tasks found</h4>
                  <p className="empty-state__description">
                    {searchTerm ? 'Try adjusting your search terms' : 'Create your first task to get started'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="tasks-editor">
            {currentTask ? (
              <div className="editor-container">
                <div className="editor-header">
                  <input
                    type="text"
                    value={currentTask.title}
                    onChange={(e) => {
                      updateTaskMutation.mutate({
                        id: currentTask.id,
                        title: e.target.value,
                        content: currentTask.content
                      });
                    }}
                    className="editor-title"
                    placeholder="Untitled"
                  />
                  <div className="editor-actions">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this task?')) {
                          deleteTaskMutation.mutate(currentTask.id);
                        }
                      }}
                      loading={deleteTaskMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Todo Items */}
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
                    Choose a task from the list or create a new one
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