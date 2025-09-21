import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { notebooksApi, notesApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import sectionLoader from '../assets/section_loader.json';
import './NotebooksPage.css';

export default function NotebooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [expandedNotebook, setExpandedNotebook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      setIsCreating(false);
      setNewNotebookName('');
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
        <div className="notebooks-loading">
          <Lottie animationData={sectionLoader} style={{ width: 400, height: 400 }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="notebooks-page">
        <div className="notebooks-container">
          <div className="notebooks-header">
            <h1 className="font-h1">Notebooks</h1>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search notebooks..."
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
              className="create-notebook-form"
            >
              <input
                type="text"
                placeholder="Notebook name"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                className="notebook-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
                autoFocus
              />
              <div className="form-actions">
                <Button onClick={handleCreateNotebook} loading={createNotebookMutation.isPending}>
                  Create
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setNewNotebookName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          <div className="notebooks-list">
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
                    className="notebook-container"
                  >
                    <div 
                      className="notebook-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNotebook(isExpanded ? null : notebook.id);
                      }}
                    >
                      <div className="notebook-header">
  
                        <div className="notebook-info">
                          <h3 className="notebook-title">{notebook.title}</h3>
                          <p className="notebook-meta">
                            {notebookNotes.length} notes
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
                        className="notes-grid"
                      >
                        {notebookNotes.length > 0 ? (
                          notebookNotes.map((note) => (
                            <motion.div
                              key={note.id}
                              className="note-card"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/notes/${note.id}`);
                              }}
                              whileHover={{ scale: 1.05 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4 className="note-title">{note.title}</h4>
                              <p className="note-preview">
                                {note.content && typeof note.content === 'string' 
                                  ? note.content.replace(/<[^>]*>/g, '').substring(0, 80) + '...' 
                                  : 'No content'
                                }
                              </p>
                              <span className="note-date">
                                {new Date(note.updated_at).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))
                        ) : (
                          <div className="empty-notes">
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

          {notebooks.length === 0 && !isCreating && (
            <div className="empty-state">
  
              <h3 className="empty-state__title">No notebooks yet</h3>
              <p className="empty-state__description">
                Create your first notebook to organize your notes
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}