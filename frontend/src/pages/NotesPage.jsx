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
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [shareLink, setShareLink] = useState('');

  
  // Real-time collaboration
  const { connectedUsers, isConnected } = useCollaboration(noteId);

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
      setIsCreatingNotebook(false);
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
    mutationFn: (noteId) => notesApi.createShareLink(noteId, { permission: 'view' }),
    onSuccess: (data) => {
      setShareLink(data.share_url);
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
      navigate('/notes');
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
      <div className="notes-page">
        <div className="notes-layout">
          {/* Notebooks Sidebar */}
          <div className="notes-sidebar">
            <div className="sidebar-header">
              <h3>Notebooks</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNotebook(true)}
              >
                +
              </Button>
            </div>

            {isCreatingNotebook && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="create-notebook"
              >
                <input
                  type="text"
                  placeholder="Notebook name"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  className="create-notebook__input"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
                />
                <div className="create-notebook__actions">
                  <Button size="sm" onClick={handleCreateNotebook}>
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNotebook(false);
                      setNewNotebookName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="notebooks-list">
              <button
                className={`notebook-item ${!selectedNotebook ? 'notebook-item--active' : ''}`}
                onClick={() => setSelectedNotebook(null)}
              >

                <span>All Notes</span>
                <span className="notebook-count">{notes.length}</span>
              </button>

              {notebooks.map((notebook) => (
                <button
                  key={notebook.id}
                  className={`notebook-item ${selectedNotebook === notebook.id ? 'notebook-item--active' : ''}`}
                  onClick={() => setSelectedNotebook(notebook.id)}
                >

                  <span>{notebook.title}</span>
                  <span className="notebook-count">{notebook.note_count || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes List */}
          <div className="notes-list">
            <div className="notes-list-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <Button onClick={handleCreateNote} loading={createNoteMutation.isPending}>
                New Note
              </Button>
            </div>

            <div className="notes-items">
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`note-item ${noteId === note.id ? 'note-item--active' : ''}`}
                  >
                    <Link to={`/notes/${note.id}`} className="note-item__link">
                      <h4 className="note-item__title">{note.title}</h4>
                      <p className="note-item__preview">
                        {note.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                      </p>
                      <div className="note-item__meta">
                        {note.notebook_name && (
                          <span className="note-item__notebook">{note.notebook_name}</span>
                        )}
                        <span className="note-item__date">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredNotes.length === 0 && (
                <div className="empty-state">

                  <h4 className="empty-state__title">No notes found</h4>
                  <p className="empty-state__description">
                    {searchTerm ? 'Try adjusting your search terms' : 'Create your first note to get started'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="notes-editor">
            {currentNote ? (
              <div className="editor-container">
                <div className="editor-header">
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
                    className="editor-title"
                    placeholder="Untitled"
                  />
                  <div className="editor-actions">

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCollaborators(true)}
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
                        if (confirm('Move this note to trash?')) {
                          deleteNoteMutation.mutate(currentNote.id);
                        }
                      }}
                      loading={deleteNoteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="editor-collaboration">
                  {connectedUsers.length > 0 && (
                    <div className="collaboration-bar">
                      <div className="connected-users">
                        <span className="collaboration-status">
                          {isConnected ? '🟢' : '🔴'} 
                          {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''} online
                        </span>
                        <div className="user-avatars">
                          {connectedUsers.slice(0, 3).map((user, index) => (
                            <div key={user.userId || `user-${index}`} className="user-avatar" title={user.name}>
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} />
                              ) : (
                                <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                          {connectedUsers.length > 3 && (
                            <div key="user-count" className="user-avatar user-count">
                              +{connectedUsers.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <RichEditor
                    content={currentNote.content}
                    onChange={handleNoteChange}
                    placeholder="Start writing your note..."
                  />
                </div>
              </div>
            ) : (
              <div className="editor-empty">
                <div className="empty-state">
                  <div className="empty-state__image">
                    <Lottie animationData={notesAnimation} style={{ width: 400, height: 400}} />
                  </div>
                  <h4 className="empty-state__title">Select a note to start editing</h4>
                  <p className="empty-state__description">
                    Choose a note from the list or create a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version History Modal */}
        {showVersions && (
          <div className="modal-overlay" onClick={() => setShowVersions(false)}>
            <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3>Version History</h3>
                <button 
                  className="modal__close"
                  onClick={() => setShowVersions(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal__content modal__content--split">
                <div className="versions-panel">
                  {versions.length > 0 ? (
                    <div className="versions-list">
                      {versions.map((version) => (
                        <div 
                          key={version.id} 
                          className={`version-item ${selectedVersion?.id === version.id ? 'version-item--selected' : ''}`}
                          onClick={() => setSelectedVersion(version)}
                        >
                          <div className="version-info">
                            <div className="version-date">
                              {new Date(version.created_at).toLocaleString()}
                            </div>
                            <div className="version-changes">
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
                
                <div className="version-preview">
                  {selectedVersion ? (
                    <div className="preview-content">
                      <h4>Preview</h4>
                      <div className="preview-text">
                        {selectedVersion.content?.content?.[0]?.content?.[0]?.text || 'No content available'}
                      </div>
                    </div>
                  ) : (
                    <div className="preview-placeholder">
                      <p>Select a version to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collaborators Modal */}
        {showCollaborators && (
          <div className="modal-overlay" onClick={() => setShowCollaborators(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3>Share & Collaborate</h3>
                <button 
                  className="modal__close"
                  onClick={() => setShowCollaborators(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal__content">
                
                <div className="share-section">
                  <label>Share link:</label>
                  <div className="share-link">
                    <input
                      type="text"
                      value={shareLink || 'Click Generate to create a share link'}
                      readOnly
                      className="form-input"
                    />
                    {shareLink ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                        }}
                      >
                        Copy
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => {
                          createShareLinkMutation.mutate(currentNote.id);
                        }}
                        loading={createShareLinkMutation.isPending}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="collaborators-list">
                  <h4>Collaborators:</h4>
                  {connectedUsers.length > 0 ? (
                    <div className="collaborators">
                      {connectedUsers.map((user, index) => (
                        <div key={user.userId || `collaborator-${index}`} className="collaborator-item">
                          <div className="collaborator-info">
                            <div className="collaborator-avatar">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} />
                              ) : (
                                <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="collaborator-name">{user.name}</div>
                              <div className="collaborator-status">🟢 Online</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>No one else is currently viewing this note</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}