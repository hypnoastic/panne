import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (window.opener) {
      // We're in a popup window
      if (code) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          code,
          state
        }, window.location.origin);
      } else if (error) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: error || 'OAuth authentication failed'
        }, window.location.origin);
      }
      window.close();
    } else {
      // We're in the main window (redirect mode)
      // The main auth component will handle this
      if (error) {
        console.error('OAuth Error:', error);
      }
    }
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem'
    }}>
      <LoadingSpinner />
      <p>Processing authentication...</p>
    </div>
  );
}