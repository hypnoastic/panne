import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notesApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import SectionLoader from '../components/SectionLoader';
import Lottie from 'lottie-react';
import collabAnimation from '../assets/collab.json';
import './CollabPage.css';

export default function CollabPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: collabNotes = [], isFetching: searchLoading } = useQuery({
    queryKey: ['collab-notes', searchTerm],
    queryFn: () => notesApi.getCollabNotes({ search: searchTerm })
  });
  
  const { isLoading: notesLoading } = useQuery({
    queryKey: ['collab-notes-initial'],
    queryFn: () => notesApi.getCollabNotes(),
    enabled: !searchTerm
  });

  const { data: permissionRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['permission-requests'],
    queryFn: () => notesApi.getPermissionRequests(),
    refetchInterval: 5000
  });

  const respondToPermissionMutation = useMutation({
    mutationFn: ({ requestId, response }) => notesApi.respondToPermission(requestId, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries(['permission-requests']);
      setSelectedRequest(null);
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'denied': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  if (notesLoading || requestsLoading) {
    return (
      <AppLayout>
        <SectionLoader size="lg" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="collabpage-collab-page">
        <div className="collabpage-container">
          <div className="collabpage-header">
            <h1>Collaboration</h1>
            <div className="collabpage-search-box">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="collabpage-search-input"
              />
            </div>
          </div>

          <div className="collabpage-content">
            {/* Collaborative Notes Section - 70% */}
            <div className="collabpage-notes-section">
              <div className="collabpage-section-header">
                <h2>Notes</h2>
                <span className="collabpage-count">{collabNotes.length}</span>
              </div>

              {searchLoading && searchTerm ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#9CA3AF' }}>
                  Searching...
                </div>
              ) : collabNotes.length === 0 ? (
                <div className="collabpage-empty-state">
                  <div className="collabpage-empty-icon"></div>
                  <h3>{searchTerm ? 'No notes found' : 'No collaborative notes yet'}</h3>
                  <p>{searchTerm ? 'Try adjusting your search terms' : 'Notes you share or that are shared with you will appear here'}</p>
                </div>
              ) : (
                <div className="collabpage-notes-grid">
                  {collabNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="collabpage-note-card"
                      onClick={() => navigate(`/notes/${note.id}`)}
                    >
                      <div className="collabpage-note-header">
                        <h3 className="collabpage-note-title">{note.title}</h3>
                        <div className="collabpage-note-role">
                          {note.is_owner ? 'Owner' : 'Collaborator'}
                        </div>
                      </div>
                      
                      <p className="collabpage-note-preview">
                        {note.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                      </p>
                      
                      <div className="collabpage-note-meta">
                        <div className="collabpage-collaborators">
                          <span className="collabpage-collab-count">
                            {note.collaborator_count || 0} collaborators
                          </span>
                        </div>
                        <div className="collabpage-note-date">
                          {formatDate(note.updated_at)}
                        </div>
                      </div>
                      
                      {note.permission && (
                        <div className="collabpage-permission-badge">
                          {note.permission === 'edit' ? 'Can edit' : 'View only'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requests Section - 30% */}
            <div className="collabpage-requests-section">
              <div className="collabpage-section-header">
                <h2>Requests</h2>
                <span className="collabpage-count">{permissionRequests.length}</span>
              </div>

              {permissionRequests.length === 0 ? (
                <div className="collabpage-empty-state collabpage-empty-state--small">
                  <div className="collabpage-empty-icon">
                    <Lottie animationData={collabAnimation} style={{ width: 300, height: 300 }} />
                  </div>
                  <h4>No pending requests</h4>
                  <p>Permission requests will appear here</p>
                </div>
              ) : (
                <div className="collabpage-requests-list">
                  {permissionRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className={`collabpage-request-item ${selectedRequest?.id === request.id ? 'collabpage-request-item--selected' : ''}`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="collabpage-request-header">
                        <div className="collabpage-requester-info">
                          <div className="collabpage-requester-avatar">
                            {request.requester_avatar ? (
                              <img src={request.requester_avatar} alt={request.requester_name} />
                            ) : (
                              <span>{request.requester_name?.charAt(0)?.toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="collabpage-requester-name">{request.requester_name}</div>
                            <div className="collabpage-request-note">{request.note_title}</div>
                          </div>
                        </div>
                        <div 
                          className="collabpage-request-status"
                          style={{ color: getStatusColor(request.status) }}
                        >
                          {request.status}
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="collabpage-request-message">
                          "{request.message}"
                        </div>
                      )}
                      
                      <div className="collabpage-request-date">
                        {formatDate(request.created_at)}
                      </div>
                      
                      {request.status === 'pending' && (
                        <div className="collabpage-request-actions">
                          <button 
                            className="collabpage-btn collabpage-btn--approve"
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToPermissionMutation.mutate({
                                requestId: request.id,
                                response: 'approved'
                              });
                            }}
                            disabled={respondToPermissionMutation.isPending}
                          >
                            Approve
                          </button>
                          <button 
                            className="collabpage-btn collabpage-btn--deny"
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToPermissionMutation.mutate({
                                requestId: request.id,
                                response: 'denied'
                              });
                            }}
                            disabled={respondToPermissionMutation.isPending}
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}