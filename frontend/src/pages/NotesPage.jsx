import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { notesApi, notebooksApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import RichEditor from '../components/RichEditor';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCollaboration } from '../hooks/useCollaboration';

import notesAnimation from '../assets/notes.json';
import './NotesPage.css';

export default function NotesPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [showCreateNotebookModal, setShowCreateNotebookModal] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePermission, setSharePermission] = useState('read');
  const [shareVisibility, setShareVisibility] = useState('private');
  const [showOnlineUsersModal, setShowOnlineUsersModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [lastRequestCount, setLastRequestCount] = useState(0);


  
  // Real-time collaboration
  const { connectedUsers, isConnected } = useCollaboration(noteId);

  // Permission requests query
  const { data: permissionRequests = [] } = useQuery({
    queryKey: ['permission-requests'],
    queryFn: () => notesApi.getPermissionRequests(),
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Show toast when new permission requests arrive
  useEffect(() => {
    if (permissionRequests.length > lastRequestCount && lastRequestCount > 0) {
      const newCount = permissionRequests.length - lastRequestCount;
      setToastMessage(`${newCount} new permission request${newCount > 1 ? 's' : ''} received`);
      setShowToast(true);
      
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    setLastRequestCount(permissionRequests.length);
  }, [permissionRequests.length, lastRequestCount]);

  const { data: notebooks = [] } = useQuery({
    queryKey: ['notebooks'],
    queryFn: notebooksApi.getAll
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll
  });

  const { data: currentNote, isLoading: noteLoading } = useQuery({
    queryKey: ['notes', noteId],
    queryFn: () => notesApi.getById(noteId),
    enabled: !!noteId
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['notes', noteId, 'versions'],
    queryFn: () => notesApi.getVersions(noteId),
    enabled: !!noteId && showVersions
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['notes', noteId, 'collaborators'],
    queryFn: () => notesApi.getCollaborators(noteId),
    enabled: !!noteId && showCollaborators
  });

  const createNoteMutation = useMutation({
    mutationFn: notesApi.create,
    onSuccess: (newNote) => {
      queryClient.invalidateQueries(['notes']);
      navigate(`/notes/${newNote.id}`);
      setIsCreatingNote(false);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, ...data }) => notesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
    }
  });

  const createNotebookMutation = useMutation({
    mutationFn: notebooksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['notebooks']);
      setShowCreateNotebookModal(false);
      setNewNotebookName('');
    }
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: ({ noteId, email }) => notesApi.addCollaborator(noteId, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', noteId, 'collaborators']);
      setCollaboratorEmail('');
    }
  });

  const createShareLinkMutation = useMutation({
    mutationFn: ({ noteId, permission, visibility }) => notesApi.createShareLink(noteId, { permission, visibility }),
    onSuccess: (data) => {
      setShareLink(data.share_url);
      // Don't close modal, keep it open to show the generated link
    }
  });

  const requestPermissionMutation = useMutation({
    mutationFn: ({ noteId, message }) => notesApi.requestPermission(noteId, { message }),
    onSuccess: () => {
      setShowPermissionRequestModal(false);
    }
  });



  const restoreVersionMutation = useMutation({
    mutationFn: ({ noteId, versionId }) => notesApi.restoreVersion(noteId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', noteId]);
      setShowVersions(false);
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      setShowDeleteNoteModal(false);
      setNoteToDelete(null);
      if (noteId === noteToDelete?.id) {
        navigate('/notes');
      }
    }
  });



  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNotebook = !selectedNotebook || note.notebook_id === selectedNotebook;
    return matchesSearch && matchesNotebook;
  });

  const handleCreateNote = () => {
    createNoteMutation.mutate({
      title: 'Untitled Note',
      content: {},
      notebook_id: selectedNotebook
    });
  };

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebookMutation.mutate({
        name: newNotebookName.trim()
      });
    }
  };

  const handleNoteChange = (content) => {
    if (currentNote) {
      updateNoteMutation.mutate({
        id: currentNote.id,
        title: currentNote.title,
        content
      });
    }
  };



  return (
    <AppLayout>
      <div className="notespage-notes-page">
        <div className="notespage-notes-layout">
          {/* Notebooks Sidebar */}
          <div className="notespage-notes-sidebar">
            <div className="notespage-sidebar-header">
              <h3>Notebooks</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateNotebookModal(true)}
              >
                +
              </Button>
            </div>



            <div className="notespage-notebooks-list">
              <button
                className={`notespage-notebook-item ${!selectedNotebook ? 'notespage-notebook-item--active' : ''}`}
                onClick={() => setSelectedNotebook(null)}
              >

                <span>All Notes</span>
                <span className="notespage-notebook-count">{notes.length}</span>
              </button>

              {notebooks.map((notebook) => (
                <button
                  key={notebook.id}
                  className={`notespage-notebook-item ${selectedNotebook === notebook.id ? 'notespage-notebook-item--active' : ''}`}
                  onClick={() => setSelectedNotebook(notebook.id)}
                >

                  <span>{notebook.title}</span>
                  <span className="notespage-notebook-count">{notebook.note_count || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes List */}
          <div className="notespage-notes-list">

            <div className="notespage-notes-list-header">
              <div className="notespage-search-box">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="notespage-search-input"
                />
              </div>
              <button 
                className="notespage-plus-icon-notes" 
                onClick={handleCreateNote}
                disabled={createNoteMutation.isPending}
              >
                +
              </button>
            </div>

            <div className="notespage-notes-items">
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`notespage-note-item ${noteId === note.id ? 'notespage-note-item--active' : ''}`}
                  >
                    <Link to={`/notes/${note.id}`} className="notespage-note-item__link">
                      <h4 className="notespage-note-item__title">{note.title}</h4>
                      <p className="notespage-note-item__preview">
                        {note.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                      </p>
                      <div className="notespage-note-item__meta">
                        {note.notebook_name && (
                          <span className="notespage-note-item__notebook">{note.notebook_name}</span>
                        )}
                        <span className="notespage-note-item__date">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                    <button
                      className="note-delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNoteToDelete(note);
                        setShowDeleteNoteModal(true);
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

              {filteredNotes.length === 0 && (
                <div className="notespage-empty-state">
                  <h4 className="notespage-empty-state__title">No notes found</h4>
                  <p className="notespage-empty-state__description">
                    {searchTerm ? 'Try adjusting your search terms' : 'Create your first note to get started'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="notespage-notes-editor">
            {currentNote ? (
              <div className="notespage-editor-container">
                <div className="notespage-editor-header">
                  <div className="notespage-title-section">
                    <input
                      type="text"
                      value={currentNote.title}
                      onChange={(e) => {
                        updateNoteMutation.mutate({
                          id: currentNote.id,
                          title: e.target.value,
                          content: currentNote.content
                        });
                      }}
                      className="notespage-editor-title"
                      placeholder="Untitled"
                    />
                  </div>
                  <div className="notespage-editor-actions">

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShareLink('');
                        setSharePermission('read');
                        setShareVisibility('private');
                        setShowShareModal(true);
                      }}
                    >
                      Share
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowVersions(true)}
                    >
                      Versions
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setNoteToDelete(currentNote);
                        setShowDeleteNoteModal(true);
                      }}
                      loading={deleteNoteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="notespage-editor-collaboration">
                  <div className="notespage-ai-toolbar">
                    <button className="notespage-ai-btn">
                      ✨ AI
                    </button>
                  </div>
                  
                  <RichEditor
                    content={currentNote.content}
                    onChange={handleNoteChange}
                    placeholder="Start writing your note..."
                  />
                  {connectedUsers.length > 0 && (
                    <div className="notespage-online-users-indicator">
                      <button 
                        className="notespage-online-users-btn"
                        onClick={() => setShowOnlineUsersModal(true)}
                      >
                        <div className="notespage-online-dot"></div>
                        {connectedUsers.length} online
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="notespage-editor-empty">
                <div className="notespage-empty-state">
                  <div className="notespage-empty-state__image">
                    <Lottie animationData={notesAnimation} style={{ width: 400, height: 400}} />
                  </div>
                  <h4 className="notespage-empty-state__title">Select a note to start editing</h4>
                  <p className="notespage-empty-state__description">
                    Choose a note from the list or create a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version History Modal */}
        {showVersions && (
          <div className="notespage-modal-overlay" onClick={() => setShowVersions(false)}>
            <div className="notespage-modal notespage-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="notespage-modal__header">
                <h3>Version History</h3>
                <button 
                  className="notespage-modal__close"
                  onClick={() => setShowVersions(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="notespage-modal__content notespage-modal__content--split">
                <div className="notespage-versions-panel">
                  {versions.length > 0 ? (
                    <div className="notespage-versions-list">
                      {versions.map((version) => (
                        <div 
                          key={version.id} 
                          className={`notespage-version-item ${selectedVersion?.id === version.id ? 'notespage-version-item--selected' : ''}`}
                          onClick={() => setSelectedVersion(version)}
                        >
                          <div className="notespage-version-info">
                            <div className="notespage-version-date">
                              {new Date(version.created_at).toLocaleString()}
                            </div>
                            <div className="notespage-version-changes">
                              Version {version.version_number || 'Auto'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreVersionMutation.mutate({
                                noteId: currentNote.id,
                                versionId: version.id
                              });
                            }}
                            loading={restoreVersionMutation.isPending}
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>No version history available</p>
                    </div>
                  )}
                </div>
                
                <div className="notespage-version-preview">
                  {selectedVersion ? (
                    <div className="notespage-preview-content">
                      <h4>Preview</h4>
                      <div className="notespage-preview-text">
                        {selectedVersion.content?.content?.[0]?.content?.[0]?.text || 'No content available'}
                      </div>
                    </div>
                  ) : (
                    <div className="notespage-preview-placeholder">
                      <p>Select a version to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="notespage-modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="notespage-share-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notespage-modal-header">
                <h3>Share Note</h3>
                <button 
                  className="notespage-modal-close"
                  onClick={() => setShowShareModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notespage-modal-content">
                <div className="notespage-share-options">
                  <div className="notespage-option-group">
                    <label>Permission</label>
                    <div className="notespage-radio-group">
                      <label className="notespage-radio-label">
                        <input
                          type="radio"
                          name="permission"
                          value="read"
                          checked={sharePermission === 'read'}
                          onChange={(e) => setSharePermission(e.target.value)}
                        />
                        <span>Read Only</span>
                      </label>
                      <label className="notespage-radio-label">
                        <input
                          type="radio"
                          name="permission"
                          value="write"
                          checked={sharePermission === 'write'}
                          onChange={(e) => setSharePermission(e.target.value)}
                        />
                        <span>Read & Write</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="notespage-option-group">
                    <label>Visibility</label>
                    <div className="notespage-radio-group">
                      <label className="notespage-radio-label">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={shareVisibility === 'private'}
                          onChange={(e) => setShareVisibility(e.target.value)}
                        />
                        <span>Private (Request required)</span>
                      </label>
                      <label className="notespage-radio-label">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={shareVisibility === 'public'}
                          onChange={(e) => setShareVisibility(e.target.value)}
                        />
                        <span>Public (Anyone logged in)</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="notespage-modal-actions">
                  <Button 
                    onClick={() => {
                      createShareLinkMutation.mutate({
                        noteId: currentNote.id,
                        permission: sharePermission,
                        visibility: shareVisibility
                      });
                    }}
                    loading={createShareLinkMutation.isPending}
                  >
                    Generate Link
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
                
                {shareLink && (
                  <div className="notespage-share-result">
                    <label>Share Link:</label>
                    <div className="notespage-share-link">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="notespage-modal-input"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Online Users Modal */}
        {showOnlineUsersModal && (
          <div className="notespage-modal-overlay" onClick={() => setShowOnlineUsersModal(false)}>
            <div className="notespage-online-users-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notespage-modal-header">
                <h3>Online Users ({connectedUsers.length})</h3>
                <button 
                  className="notespage-modal-close"
                  onClick={() => setShowOnlineUsersModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notespage-modal-content">
                <div className="notespage-users-list">
                  {connectedUsers.map((user, index) => (
                    <div key={user.userId || `user-${index}`} className="notespage-user-item">
                      <div className="notespage-user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="notespage-user-info">
                        <div className="notespage-user-name">{user.name}</div>
                        <div className="notespage-user-status">
                          <span className="notespage-status-indicator notespage-online"></span>
                          Online
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Create Notebook Modal */}
        {showCreateNotebookModal && (
          <div className="notespage-modal-overlay" onClick={() => setShowCreateNotebookModal(false)}>
            <div className="notespage-create-notebook-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notespage-modal-header">
                <h3>Create New Notebook</h3>
                <button 
                  className="notespage-modal-close" 
                  onClick={() => setShowCreateNotebookModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notespage-modal-content">
                <div className="notespage-modal-form">
                  <input
                    type="text"
                    placeholder="Notebook name"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    className="notespage-modal-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
                    autoFocus
                  />
                  <div className="notespage-modal-actions">
                    <Button onClick={handleCreateNotebook} loading={createNotebookMutation.isPending}>
                      Create
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreateNotebookModal(false);
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

        {/* Delete Note Modal */}
        {showDeleteNoteModal && noteToDelete && (
          <div className="notespage-modal-overlay" onClick={() => setShowDeleteNoteModal(false)}>
            <div className="notespage-delete-note-modal" onClick={(e) => e.stopPropagation()}>
              <div className="notespage-modal-header">
                <h3>Delete Note</h3>
                <button 
                  className="notespage-modal-close" 
                  onClick={() => setShowDeleteNoteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="notespage-modal-content">
                <p className="notespage-delete-message">
                  Are you sure you want to move "{noteToDelete.title}" to trash?
                </p>
                <div className="notespage-modal-actions">
                  <Button 
                    onClick={() => deleteNoteMutation.mutate(noteToDelete.id)}
                    loading={deleteNoteMutation.isPending}
                  >
                    Move to Trash
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteNoteModal(false);
                      setNoteToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="notespage-toast"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}