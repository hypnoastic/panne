import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function GoogleAuth({ onSuccess, onError }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const googleAuthMutation = useMutation({
    mutationFn: authApi.googleAuth,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      if (onSuccess) onSuccess(data);
      else navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Google Auth Error:', error);
      if (onError) onError(error);
    }
  });

  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response) => {
            googleAuthMutation.mutate(response.credential);
          }
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%'
          }
        );
      }
    };

    if (window.google) {
      initializeGoogleAuth();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = initializeGoogleAuth;
      document.body.appendChild(script);
    }
  }, []);

  return <div id="google-signin-btn"></div>;
}