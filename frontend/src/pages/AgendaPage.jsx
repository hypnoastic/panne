import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import sectionLoader from '../assets/section_loader.json';
import './AgendaPage.css';

// API calls
const agendasApi = {
  getAll: async () => {
    const response = await fetch('http://localhost:5000/api/agendas', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch agendas');
    return response.json();
  },
  create: async (agenda) => {
    const response = await fetch('http://localhost:5000/api/agendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(agenda)
    });
    if (!response.ok) throw new Error('Failed to create agenda');
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

export default function AgendaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState('');
  const [expandedAgenda, setExpandedAgenda] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: agendas = [], isLoading, error: agendasError } = useQuery({
    queryKey: ['agendas'],
    queryFn: agendasApi.getAll,
    retry: 1
  });

  const { data: tasks = [], error: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.getAll,
    retry: 1
  });

  if (agendasError || tasksError) {
    return (
      <AppLayout>
        <div className="agenda-page">
          <div className="agenda-container">
            <div className="error-state">
              <h3>Error loading data</h3>
              <p>Please try refreshing the page</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const createAgendaMutation = useMutation({
    mutationFn: agendasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['agendas']);
      setIsCreating(false);
      setNewAgendaName('');
    }
  });

  const handleCreateAgenda = () => {
    if (newAgendaName.trim()) {
      createAgendaMutation.mutate({
        name: newAgendaName.trim()
      });
    }
  };

  const filteredAgendas = agendas.filter(agenda => 
    (agenda.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle navigation from dashboard to specific task
  useEffect(() => {
    try {
      if (location.state?.selectedTaskId && tasks.length > 0 && agendas.length > 0) {
        const selectedTask = tasks.find(task => task.id === location.state.selectedTaskId);
        if (selectedTask) {
          // Find and expand the event containing this task
          const parentAgenda = agendas.find(agenda => 
            tasks.some(task => task.agenda_id === agenda.id && task.id === selectedTask.id)
          );
          if (parentAgenda) {
            setExpandedAgenda(parentAgenda.id);
          }
        }
      }
    } catch (error) {
      console.error('Error handling task navigation:', error);
    }
  }, [location.state, tasks, agendas]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="agenda-loading">
          <Lottie animationData={sectionLoader} style={{ width: 400, height: 400 }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="agenda-page">
        <div className="agenda-container">
          <div className="agenda-header">
            <h1 className="font-h1">Agenda</h1>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search agendas..."
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
              className="create-agenda-form"
            >
              <input
                type="text"
                placeholder="Agenda name"
                value={newAgendaName}
                onChange={(e) => setNewAgendaName(e.target.value)}
                className="agenda-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateAgenda()}
                autoFocus
              />
              <div className="form-actions">
                <Button onClick={handleCreateAgenda} loading={createAgendaMutation.isPending}>
                  Create
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setNewAgendaName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          <div className="agenda-list">
            <AnimatePresence>
              {filteredAgendas.map((agenda) => {
                const agendaTasks = tasks.filter(task => task.agenda_id === agenda.id);
                const isExpanded = expandedAgenda === agenda.id;
                
                return (
                  <motion.div
                    key={agenda.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="agenda-item-container"
                  >
                    <div 
                      className="agenda-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedAgenda(isExpanded ? null : agenda.id);
                      }}
                    >
                      <div className="agenda-item-header">
                        <div className="agenda-info">
                          <h3 className="agenda-title">{agenda.name}</h3>
                          <p className="agenda-meta">
                            {agendaTasks.length} tasks
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
                        {agendaTasks.length > 0 ? (
                          agendaTasks.map((task) => (
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
                            <p>No tasks in this agenda</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {agendas.length === 0 && (
            <div className="empty-state">
              <h3 className="empty-state__title">No agendas yet</h3>
              <p className="empty-state__description">
                Create your first agenda to organize your tasks
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}