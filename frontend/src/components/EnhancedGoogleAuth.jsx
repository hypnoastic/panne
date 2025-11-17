import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import Button from './Button';

export default function EnhancedGoogleAuth({ onSuccess, onError, mode = 'popup' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Legacy Google Sign-In (for existing compatibility)
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

  // OAuth flow with authorization code
  const googleCallbackMutation = useMutation({
    mutationFn: authApi.googleCallback,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      if (onSuccess) onSuccess(data);
      else navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Google OAuth Error:', error);
      if (onError) onError(error);
    }
  });

  // Get OAuth URL mutation
  const getOAuthUrlMutation = useMutation({
    mutationFn: authApi.getGoogleAuthUrl,
    onSuccess: (data) => {
      if (mode === 'redirect') {
        window.location.href = data.authUrl;
      } else {
        handlePopupAuth(data.authUrl);
      }
    },
    onError: (error) => {
      console.error('OAuth URL Error:', error);
      setIsLoading(false);
      if (onError) onError(error);
    }
  });

  const handlePopupAuth = (authUrl) => {
    const popup = window.open(
      authUrl,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);

    // Listen for the authorization code from popup
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        googleCallbackMutation.mutate(event.data.code);
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        setIsLoading(false);
        if (onError) onError(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageListener);
  };

  const handleOAuthFlow = () => {
    setIsLoading(true);
    getOAuthUrlMutation.mutate();
  };

  // Initialize legacy Google Sign-In
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response) => {
            googleAuthMutation.mutate(response.credential);
          }
        });
        
        // Render the legacy button (hidden by default)
        const legacyButton = document.getElementById('google-signin-btn-legacy');
        if (legacyButton) {
          window.google.accounts.id.renderButton(legacyButton, {
            theme: 'outline',
            size: 'large',
            width: '100%'
          });
        }
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

  // Check for OAuth callback in URL (for redirect mode)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      googleCallbackMutation.mutate(code);
    } else if (error) {
      console.error('OAuth Error:', error);
      if (onError) onError(new Error(error));
    }
  }, []);

  return (
    <div className="enhanced-google-auth">
      {/* Enhanced OAuth Button */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleOAuthFlow}
        loading={isLoading || getOAuthUrlMutation.isPending || googleCallbackMutation.isPending}
        className="google-auth-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      {/* Legacy Google Sign-In Button (hidden) */}
      <div id="google-signin-btn-legacy" style={{ display: 'none' }}></div>
    </div>
  );
}