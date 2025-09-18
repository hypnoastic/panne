import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import RichEditor from '../components/RichEditor';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCollaboration } from '../hooks/useCollaboration';

export default function SharedNotePage() {
  const { shareId } = useParams();
  const queryClient = useQueryClient();

  const { data: sharedNote, isLoading } = useQuery({
    queryKey: ['shared-note', shareId],
    queryFn: () => notesApi.getSharedNote(shareId)
  });

  const { connectedUsers, isConnected } = useCollaboration(sharedNote?.id);

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!sharedNote) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Shared note not found</h2>
          <p>This link may be invalid or expired.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ height: 'calc(100vh - 73px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{sharedNote.title}</h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Shared note • {sharedNote.permission === 'edit' ? 'Can edit' : 'View only'}
              </p>
            </div>
            {connectedUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {isConnected ? '🟢' : '🔴'} {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''} online
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {connectedUsers.slice(0, 3).map((user) => (
                    <div 
                      key={user.userId} 
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                      title={user.name}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        user.name?.charAt(0)?.toUpperCase()
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <RichEditor
            content={sharedNote.content}
            onChange={sharedNote.permission === 'edit' ? handleNoteChange : undefined}
            placeholder={sharedNote.permission === 'edit' ? "Start editing..." : "This note is read-only"}
          />
        </div>
      </div>
    </AppLayout>
  );
}