import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import './AgendaPage.css';

import { agendasApi, tasksApi, todosApi } from '../services/api';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const limit = 5;

  const { data: agendasResponse, error: agendasError, isFetching: searchLoading } = useQuery({
    queryKey: ['agendas', currentPage, searchTerm, dateFrom, dateTo, sortBy, sortOrder],
    queryFn: () => agendasApi.getAll({
      page: currentPage,
      limit,
      search: searchTerm,
      date_from: dateFrom,
      date_to: dateTo,
      sort: sortBy,
      order: sortOrder
    }),
    retry: 1
  });
  
  const { isLoading } = useQuery({
    queryKey: ['agendas-initial'],
    queryFn: () => agendasApi.getAll({ page: 1, limit }),
    enabled: !searchTerm && !dateFrom && !dateTo && currentPage === 1,
    retry: 1
  });
  
  const agendas = agendasResponse?.data || [];
  const totalPages = agendasResponse?.totalPages || 1;
  const totalItems = agendasResponse?.totalItems || 0;

  const { data: tasks = [], error: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
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
    mutationFn: agendasApi.delete,
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

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="agendapage-search-input"
              />
              <button className="agendapage-plus-icon" onClick={() => setShowCreateModal(true)}>
                +
              </button>
            </div>
          </div>



          <div className="agendapage-controls">
            <div className="agendapage-filters">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="agendapage-date-input"
              />
              <span className="agendapage-date-separator">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="agendapage-date-input"
              />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setSortBy(sort);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
                className="agendapage-sort-select"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          <div className="agendapage-list">
            {searchLoading && (searchTerm || dateFrom || dateTo) ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#9CA3AF' }}>
                Searching...
              </div>
            ) : (
              <AnimatePresence>
                {agendas.map((agenda) => {
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
            )}
          </div>

          {!searchLoading && agendas.length === 0 && (
            <div className="agendapage-empty-state">
              <h3 className="agendapage-empty-state-title">
                {searchTerm || dateFrom || dateTo ? 'No agendas found' : 'No agendas yet'}
              </h3>
              <p className="agendapage-empty-state-description">
                {searchTerm || dateFrom || dateTo 
                  ? 'Try adjusting your search or date filters' 
                  : 'Create your first agenda to organize your tasks'
                }
              </p>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="agendapage-pagination">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="agendapage-pagination-btn"
              >
                ← Previous
              </button>
              <span className="agendapage-pagination-info">
                Page {currentPage} of {totalPages} ({totalItems} total)
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="agendapage-pagination-btn"
              >
                Next →
              </button>
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