import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../services/api';
import api from '../services/api';
import AppLayout from '../components/AppLayout';
import RichEditor from '../components/RichEditor';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCollaboration } from '../hooks/useCollaboration';
import './SharedNotePage.css';

export default function SharedNotePage() {
  const { shareId } = useParams();
  const queryClient = useQueryClient();
  const [showOnlineUsersModal, setShowOnlineUsersModal] = useState(false);

  const { data: sharedNote, isLoading, error } = useQuery({
    queryKey: ['shared-note', shareId],
    queryFn: () => notesApi.getSharedNote(shareId),
    retry: false
  });

  const { connectedUsers, isConnected } = useCollaboration(sharedNote?.id);

  const requestAccessMutation = useMutation({
    mutationFn: ({ shareId, message }) => 
      api.post(`/notes/shared/${shareId}/request`, { message }).then(res => res.data),
    onSuccess: () => {
      alert('Access request sent to note owner!');
      // Refetch to get updated status
      setTimeout(() => {
        queryClient.invalidateQueries(['shared-note', shareId]);
      }, 1000);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, ...data }) => notesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-note', shareId]);
    }
  });

  const handleNoteChange = (content) => {
    if (sharedNote && sharedNote.permission === 'edit') {
      updateNoteMutation.mutate({
        id: sharedNote.id,
        title: sharedNote.title,
        content
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="sharednotepage-shared-note-page">
          <div className="sharednotepage-container">
            <div className="sharednotepage-loading">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="sharednotepage-shared-note-page">
          <div className="sharednotepage-container">
            <div className="sharednotepage-error-container">
              <div className="sharednotepage-error-content">
                <h2>Access Denied</h2>
                <p>{error.response?.data?.error || 'This link may be invalid or expired.'}</p>
                
                {error.response?.data?.requiresAuth && (
                  <p>Please log in to request access to this note.</p>
                )}
                
                {error.response?.data?.status === 'pending' && (
                  <div className="sharednotepage-error-details">
                    <p>Your access request is pending approval from the note owner.</p>
                    <p>Requested by: <span className="sharednotepage-user-email">{error.response.data.userEmail}</span></p>
                  </div>
                )}
                
                {error.response?.data?.status === 'denied' && (
                  <div className="sharednotepage-error-details">
                    <p>Your access request was denied by the note owner.</p>
                    <p>Requested by: <span className="sharednotepage-user-email">{error.response.data.userEmail}</span></p>
                  </div>
                )}
                
                {error.response?.data?.requiresPermission && (
                  <div className="sharednotepage-error-details">
                    <p>You need permission from the note owner to access this private note.</p>
                    <p>Your email: <span className="sharednotepage-user-email">{error.response.data.userEmail}</span></p>
                    <button 
                      className="sharednotepage-request-btn"
                      onClick={() => {
                        const message = prompt('Optional message to note owner:');
                        requestAccessMutation.mutate({
                          shareId,
                          message: message || ''
                        });
                      }}
                      disabled={requestAccessMutation.isPending}
                    >
                      {requestAccessMutation.isPending ? 'Requesting...' : 'Request Access'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sharedNote) {
    return (
      <AppLayout>
        <div className="sharednotepage-shared-note-page">
          <div className="sharednotepage-container">
            <div className="sharednotepage-error-container">
              <div className="sharednotepage-error-content">
                <h2>Shared note not found</h2>
                <p>This link may be invalid or expired.</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="sharednotepage-shared-note-page">
        <div className="sharednotepage-container">
          <div className="sharednotepage-header">
            <div className="sharednotepage-title-section">
              <h1>{sharedNote.title}</h1>
              <div className="sharednotepage-subtitle">
                Shared note
                <span className="sharednotepage-permission-badge">
                  {sharedNote.permission === 'edit' ? 'Can edit' : 'View only'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="sharednotepage-editor-container">
            <div className="sharednotepage-ai-toolbar">
              <button className="sharednotepage-ai-btn">
                ✨ AI
              </button>
            </div>
            
            <div className="sharednotepage-editor-wrapper">
              <RichEditor
                content={sharedNote.content}
                onChange={sharedNote.permission === 'edit' ? handleNoteChange : undefined}
                placeholder={sharedNote.permission === 'edit' ? "Start editing..." : "This note is read-only"}
              />
            </div>
            
            {connectedUsers.length > 0 && (
              <div className="sharednotepage-online-users-indicator">
                <button 
                  className="sharednotepage-online-users-btn"
                  onClick={() => setShowOnlineUsersModal(true)}
                >
                  <div className="sharednotepage-online-dot"></div>
                  {connectedUsers.length} online
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Online Users Modal */}
        {showOnlineUsersModal && (
          <div className="sharednotepage-modal-overlay" onClick={() => setShowOnlineUsersModal(false)}>
            <div className="sharednotepage-online-users-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sharednotepage-modal-header">
                <h3>Online Users ({connectedUsers.length})</h3>
                <button 
                  className="sharednotepage-modal-close"
                  onClick={() => setShowOnlineUsersModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="sharednotepage-modal-content">
                <div className="sharednotepage-users-list">
                  {connectedUsers.map((user, index) => (
                    <div key={user.userId || `user-${index}`} className="sharednotepage-user-item">
                      <div className="sharednotepage-user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="sharednotepage-user-info">
                        <div className="sharednotepage-user-name">{user.name}</div>
                        <div className="sharednotepage-user-status">
                          <span className="sharednotepage-status-indicator sharednotepage-online"></span>
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
      </div>
    </AppLayout>
  );
}