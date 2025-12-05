import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';

import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import eventsAnimation from '../assets/events.json';
import './TasksPage.css';

import { agendasApi, tasksApi, todosApi } from '../services/api';

export default function TasksPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateAgendaModal, setShowCreateAgendaModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [localTitle, setLocalTitle] = useState('');



  const { data: agendasResponse } = useQuery({
    queryKey: ['agendas-sidebar'],
    queryFn: () => agendasApi.getAll()
  });
  
  const agendas = agendasResponse?.data || agendasResponse || [];

  const { data: tasks = [], isFetching: searchLoading } = useQuery({
    queryKey: ['tasks', searchTerm],
    queryFn: () => tasksApi.getAll({ search: searchTerm })
  });

  const { data: currentTask, isLoading: taskLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.getById(taskId),
    enabled: !!taskId
  });

  const { data: todoItems = [] } = useQuery({
    queryKey: ['todoItems', taskId],
    queryFn: () => todosApi.getByTaskId(taskId),
    enabled: !!taskId
  });

  const createAgendaMutation = useMutation({
    mutationFn: agendasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['agendas']);
      setShowCreateAgendaModal(false);
      setNewAgendaName('');
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
      setShowDeleteTaskModal(false);
      setTaskToDelete(null);
      if (taskId === taskToDelete?.id) {
        navigate('/tasks');
      }
    }
  });

  const createTodoMutation = useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['todoItems', taskId]);
    }
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, ...data }) => todosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['todoItems', taskId]);
    }
  });

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Update local title when task changes
  useEffect(() => {
    if (currentTask) {
      setLocalTitle(currentTask.title);
    }
  }, [currentTask?.id]);

  // Debounced title update
  const debouncedTitleUpdate = useCallback(
    debounce((title) => {
      if (currentTask && title !== currentTask.title) {
        updateTaskMutation.mutate({
          id: currentTask.id,
          title,
          content: currentTask.content
        });
      }
    }, 1000),
    [currentTask?.id]
  );



  const filteredTasks = tasks.filter(task => {
    const matchesAgenda = !selectedAgenda || task.agenda_id === selectedAgenda;
    return matchesAgenda;
  });

  const handleCreateAgenda = () => {
    if (newAgendaName.trim()) {
      createAgendaMutation.mutate({
        name: newAgendaName.trim()
      });
    }
  };

  const handleCreateTask = () => {
    const taskTitle = newTaskName.trim() || 'Untitled Task';
    createTaskMutation.mutate({
      title: taskTitle,
      content: {},
      agenda_id: selectedAgenda
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
        <div className={`tasks-layout ${taskId ? 'task-selected' : ''}`}>
          {/* Agendas Sidebar */}
          <div className="tasks-sidebar">
            <div className="sidebar-header">
              <h3>Agendas</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateAgendaModal(true)}
              >
                +
              </Button>
            </div>



            <div className="agendas-list">
              <button
                className={`agenda-item ${!selectedAgenda ? 'agenda-item--active' : ''}`}
                onClick={() => setSelectedAgenda(null)}
              >
                <span>All Tasks</span>
                <span className="agenda-count">{tasks.length}</span>
              </button>

              {agendas.map((agenda) => {
                const agendaTaskCount = tasks.filter(task => task.agenda_id === agenda.id).length;
                return (
                  <button
                    key={agenda.id}
                    className={`agenda-item ${selectedAgenda === agenda.id ? 'agenda-item--active' : ''}`}
                    onClick={() => setSelectedAgenda(agenda.id)}
                  >
                    <span>{agenda.name}</span>
                    <span className="agenda-count">{agendaTaskCount}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tasks List */}
          <div className="tasks-list">
            <div className="tasks-list-header">
              <div className="taskspage-search-box">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="taskspage-search-input"
                />
              </div>
              <button 
                className="tasks-plus-icon" 
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending}
              >
                +
              </button>
            </div>

            <div className="tasks-items">
              {searchLoading && searchTerm ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#9CA3AF' }}>
                  Searching...
                </div>
              ) : (
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
                        {task.agenda_name && (
                          <span className="task-item__agenda">{task.agenda_name}</span>
                        )}
                        <span className="task-item__date">
                          {new Date(task.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                    <button
                      className="task-delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTaskToDelete(task);
                        setShowDeleteTaskModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              )}
              
              {!searchLoading && filteredTasks.length === 0 && (
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
            {taskLoading && taskId ? (
              <div className="editor-loading">
                <SectionLoader size="md" />
              </div>
            ) : currentTask ? (
              <div className="editor-container">
                <div className="editor-header">
                  <button 
                    className="tasks-mobile-back-btn"
                    onClick={() => navigate('/tasks')}
                  >
                    ←
                  </button>
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => {
                      setLocalTitle(e.target.value);
                      debouncedTitleUpdate(e.target.value);
                    }}
                    className="editor-title"
                    placeholder="Untitled"
                  />
                  <div className="editor-actions">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setTaskToDelete(currentTask);
                        setShowDeleteTaskModal(true);
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
                    <Lottie animationData={eventsAnimation} style={{ width: 400, height: 300 }} />
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

        {/* Create Agenda Modal */}
        {showCreateAgendaModal && (
          <div className="taskspage-modal-overlay" onClick={() => setShowCreateAgendaModal(false)}>
            <div className="taskspage-create-agenda-modal" onClick={(e) => e.stopPropagation()}>
              <div className="taskspage-modal-header">
                <h3>Create New Agenda</h3>
                <button 
                  className="taskspage-modal-close" 
                  onClick={() => setShowCreateAgendaModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="taskspage-modal-content">
                <div className="taskspage-modal-form">
                  <input
                    type="text"
                    placeholder="Agenda name"
                    value={newAgendaName}
                    onChange={(e) => setNewAgendaName(e.target.value)}
                    className="taskspage-modal-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateAgenda()}
                    autoFocus
                  />
                  <div className="taskspage-modal-actions">
                    <Button onClick={handleCreateAgenda} loading={createAgendaMutation.isPending}>
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreateAgendaModal(false);
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

        {/* Delete Task Modal */}
        {showDeleteTaskModal && taskToDelete && (
          <div className="taskspage-modal-overlay" onClick={() => setShowDeleteTaskModal(false)}>
            <div className="taskspage-delete-task-modal" onClick={(e) => e.stopPropagation()}>
              <div className="taskspage-modal-header">
                <h3>Delete Task</h3>
                <button 
                  className="taskspage-modal-close" 
                  onClick={() => setShowDeleteTaskModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="taskspage-modal-content">
                <p className="taskspage-delete-message">
                  Are you sure you want to move "{taskToDelete.title}" to trash?
                </p>
                <div className="taskspage-modal-actions">
                  <Button 
                    onClick={() => deleteTaskMutation.mutate(taskToDelete.id)}
                    loading={deleteTaskMutation.isPending}
                  >
                    Move to Trash
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteTaskModal(false);
                      setTaskToDelete(null);
                    }}
                  >
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