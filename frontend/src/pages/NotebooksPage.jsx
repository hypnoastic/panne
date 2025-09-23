import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { notebooksApi, notesApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import './NotebooksPage.css';

export default function NotebooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [expandedNotebook, setExpandedNotebook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState(null);

  const { data: notebooks = [], isLoading } = useQuery({
    queryKey: ['notebooks'],
    queryFn: notebooksApi.getAll
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  const createNotebookMutation = useMutation({
    mutationFn: notebooksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['notebooks']);
      setShowCreateModal(false);
      setNewNotebookName('');
    }
  });

  const deleteNotebookMutation = useMutation({
    mutationFn: (id) => fetch(`http://localhost:5000/api/notebooks/${id}/trash`, {
      method: 'POST',
      credentials: 'include'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notebooks']);
      setShowDeleteModal(false);
      setNotebookToDelete(null);
      if (expandedNotebook === notebookToDelete) {
        setExpandedNotebook(null);
      }
    }
  });

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebookMutation.mutate({
        name: newNotebookName.trim()
      });
    }
  };

  const filteredNotebooks = notebooks
    .filter(notebook => 
      notebook.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (isLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="notebookspage-page">
        <div className="notebookspage-container">
          <div className="notebookspage-header">
            <h1 className="font-h1">Notebooks</h1>
            <div className="notebookspage-header-actions">
              <input
                type="text"
                placeholder="Search notebooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="notebookspage-search-input"
              />
              <button className="notebookspage-plus-icon" onClick={() => setShowCreateModal(true)}>
                +
              </button>
            </div>
          </div>



          <div className="notebookspage-notebooks-list">
            <AnimatePresence>
              {filteredNotebooks.map((notebook) => {
                console.log('Notebook:', notebook);
                console.log('All notes:', notes);
                const notebookNotes = notes.filter(note => note.notebook_id === notebook.id);
                console.log('Filtered notes for notebook', notebook.id, ':', notebookNotes);
                const isExpanded = expandedNotebook === notebook.id;
                console.log('Is expanded:', isExpanded);
                
                return (
                  <motion.div
                    key={notebook.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="notebookspage-notebook-container"
                  >
                    <div 
                      className="notebookspage-notebook-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNotebook(isExpanded ? null : notebook.id);
                      }}
                    >
                      <div className="notebookspage-notebook-header">
  
                        <div className="notebookspage-notebook-info">
                          <h3 className="notebookspage-notebook-title">{notebook.title}</h3>
                          <p className="notebookspage-notebook-meta">
                            {notebookNotes.length} notes
                          </p>
                        </div>
                        <button
                          className="notebookspage-delete-notebook"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotebookToDelete(notebook.id);
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
                        className="notebookspage-notes-grid"
                      >
                        {notebookNotes.length > 0 ? (
                          notebookNotes.map((note) => (
                            <motion.div
                              key={note.id}
                              className="notebookspage-note-card"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/notes/${note.id}`);
                              }}
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4 className="notebookspage-note-title">{note.title}</h4>
                              <p className="notebookspage-note-preview">
                                {note.content && typeof note.content === 'string' 
                                  ? note.content.replace(/<[^>]*>/g, '').substring(0, 80) + '...' 
                                  : 'No content'
                                }
                              </p>
                              <span className="notebookspage-note-date">
                                {new Date(note.updated_at).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))
                        ) : (
                          <div className="notebookspage-empty-notes">
                            <p>No notes in this notebook</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {notebooks.length === 0 && (
            <div className="notebookspage-empty-state">
  
              <h3 className="notebookspage-empty-state__title">No notebooks yet</h3>
              <p className="notebookspage-empty-state__description">
                Create your first notebook to organize your notes
              </p>
            </div>
          )}
        </div>

        {/* Create Notebook Modal */}
        {showCreateModal && (
          <div className="notebookspage-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="notebookspage-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notebookspage-modal-header">
                <h3>Create New Notebook</h3>
                <button 
                  className="notebookspage-close-button" 
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notebookspage-modal-content">
                <div className="notebookspage-modal-form">
                  <input
                    type="text"
                    placeholder="Notebook name"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    className="notebookspage-modal-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
                    autoFocus
                  />
                  <div className="notebookspage-modal-actions">
                    <Button onClick={handleCreateNotebook} loading={createNotebookMutation.isPending}>
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewNotebookName('');
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

        {/* Delete Notebook Modal */}
        {showDeleteModal && (
          <div className="notebookspage-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="notebookspage-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notebookspage-modal-header">
                <h3>Move Notebook to Trash</h3>
                <button 
                  className="notebookspage-close-button" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notebookspage-modal-content">
                <p className="notebookspage-delete-message">
                  Are you sure you want to move this notebook to trash?
                </p>
                <div className="notebookspage-modal-actions">
                  <Button onClick={() => deleteNotebookMutation.mutate(notebookToDelete)} disabled={deleteNotebookMutation.isPending}>
                    {deleteNotebookMutation.isPending ? 'Moving to Trash...' : 'Move to Trash'}
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