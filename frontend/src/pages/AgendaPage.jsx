import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import './AgendaPage.css';

// API calls
const API_BASE_URL = import.meta.env.VITE_API_URL;

const agendasApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/agendas`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch agendas');
    return response.json();
  },
  create: async (agenda) => {
    const response = await fetch(`${API_BASE_URL}/agendas`, {
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
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  }
};

const todoItemsApi = {
  getByTaskId: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/todos`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  },
  create: async (item) => {
    const response = await fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  },
  update: async (id, updates) => {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState('');
  const [expandedAgenda, setExpandedAgenda] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agendaToDelete, setAgendaToDelete] = useState(null);

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
        <div className="agendapage-container">
          <div className="agendapage-main">
            <div className="agendapage-error-state">
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
      setShowCreateModal(false);
      setNewAgendaName('');
    }
  });

  const deleteAgendaMutation = useMutation({
    mutationFn: (id) => fetch(`${API_BASE_URL}/agendas/${id}/trash`, {
      method: 'POST',
      credentials: 'include'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agendas']);
      setShowDeleteModal(false);
      setAgendaToDelete(null);
      if (expandedAgenda === agendaToDelete) {
        setExpandedAgenda(null);
      }
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
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="agendapage-container">
        <div className="agendapage-main">
          <div className="agendapage-header">
            <h1 className="font-h1">Agenda</h1>
            <div className="agendapage-header-actions">
              <input
                type="text"
                placeholder="Search agendas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="agendapage-search-input"
              />
              <button className="agendapage-plus-icon" onClick={() => setShowCreateModal(true)}>
                +
              </button>
            </div>
          </div>



          <div className="agendapage-list">
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
                    className="agendapage-item-container"
                  >
                    <div 
                      className="agendapage-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedAgenda(isExpanded ? null : agenda.id);
                      }}
                    >
                      <div className="agendapage-item-header">
                        <div className="agendapage-info">
                          <h3 className="agendapage-title">{agenda.name}</h3>
                          <p className="agendapage-meta">
                            {agendaTasks.length} tasks
                          </p>
                        </div>
                        <button
                          className="agendapage-delete-agenda"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgendaToDelete(agenda.id);
                            setShowDeleteModal(true);
                          }}
                          title="Move to trash"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="agendapage-tasks-grid"
                      >
                        {agendaTasks.length > 0 ? (
                          agendaTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              className="agendapage-task-card"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4 className="agendapage-task-title">{task.title}</h4>
                              <p className="agendapage-task-preview">
                                {task.description 
                                  ? task.description.substring(0, 80) + '...' 
                                  : 'No description'
                                }
                              </p>
                              <span className="agendapage-task-date">
                                {new Date(task.updated_at).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))
                        ) : (
                          <div className="agendapage-empty-tasks">
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
            <div className="agendapage-empty-state">
              <h3 className="agendapage-empty-state-title">No agendas yet</h3>
              <p className="agendapage-empty-state-description">
                Create your first agenda to organize your tasks
              </p>
            </div>
          )}
        </div>

        {/* Create Agenda Modal */}
        {showCreateModal && (
          <div className="agendapage-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="agendapage-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="agendapage-modal-header">
                <h3>Create New Agenda</h3>
                <button 
                  className="agendapage-close-button" 
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="agendapage-modal-content">
                <div className="agendapage-modal-form">
                  <input
                    type="text"
                    placeholder="Agenda name"
                    value={newAgendaName}
                    onChange={(e) => setNewAgendaName(e.target.value)}
                    className="agendapage-modal-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateAgenda()}
                    autoFocus
                  />
                  <div className="agendapage-modal-actions">
                    <Button onClick={handleCreateAgenda} loading={createAgendaMutation.isPending}>
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewAgendaName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Agenda Modal */}
        {showDeleteModal && (
          <div className="agendapage-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="agendapage-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="agendapage-modal-header">
                <h3>Move Agenda to Trash</h3>
                <button 
                  className="agendapage-close-button" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="agendapage-modal-content">
                <p className="agendapage-delete-message">
                  Are you sure you want to move this agenda to trash?
                </p>
                <div className="agendapage-modal-actions">
                  <Button onClick={() => deleteAgendaMutation.mutate(agendaToDelete)} disabled={deleteAgendaMutation.isPending}>
                    {deleteAgendaMutation.isPending ? 'Moving to Trash...' : 'Move to Trash'}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}