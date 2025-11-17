import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=oauth_failed');
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token);
      
      // Fetch user data
      authApi.getCurrentUser()
        .then(user => {
          queryClient.setQueryData(['auth', 'me'], user);
          navigate('/dashboard');
        })
        .catch(() => {
          navigate('/login?error=auth_failed');
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, queryClient]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem',
      background: 'rgba(1,1,1,1)',
      color: 'white'
    }}>
      <LoadingSpinner />
      <p>Completing authentication...</p>
    </div>
  );
}

export default AuthSuccessPage;