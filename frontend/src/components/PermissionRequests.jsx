import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../services/api';
import './PermissionRequests.css';

export default function PermissionRequests() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['permission-requests'],
    queryFn: () => notesApi.getPermissionRequests()
  });

  const respondMutation = useMutation({
    mutationFn: ({ requestId, response }) => notesApi.respondToPermission(requestId, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries(['permission-requests']);
    }
  });

  if (isLoading || requests.length === 0) return null;

  return (
    <div className="permission-requests">
      <h3>Permission Requests</h3>
      {requests.map(request => (
        <div key={request.id} className="permission-request">
          <div className="request-info">
            <strong>{request.requester_name}</strong> wants access to <strong>{request.note_title}</strong>
            {request.message && <p>"{request.message}"</p>}
          </div>
          <div className="request-actions">
            <button 
              onClick={() => respondMutation.mutate({ requestId: request.id, response: 'approved' })}
              className="approve-btn"
            >
              Approve
            </button>
            <button 
              onClick={() => respondMutation.mutate({ requestId: request.id, response: 'denied' })}
              className="deny-btn"
            >
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}