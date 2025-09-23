import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../services/api';
import SectionLoader from '../components/SectionLoader';

export default function SharePage() {
  const { shareId } = useParams();
  const navigate = useNavigate();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    retry: false
  });

  useEffect(() => {
    if (!userLoading) {
      if (currentUser) {
        // User is logged in, redirect to the shared note
        navigate(`/notes/shared/${shareId}`);
      } else {
        // User not logged in, redirect to login with return URL
        navigate(`/login?redirect=/share/${shareId}`);
      }
    }
  }, [currentUser, userLoading, shareId, navigate]);

  if (userLoading) {
    return <SectionLoader fullScreen={true} />;
  }

  return null;
}