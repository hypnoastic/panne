// App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './services/api';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AIPage from './pages/AIPage';
import NotesPage from './pages/NotesPage';
import NotebooksPage from './pages/NotebooksPage';
import TasksPage from './pages/TasksPage';
import AgendaPage from './pages/AgendaPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import TrashPage from './pages/TrashPage';
import SharePage from './pages/SharePage';
import SharedNotePage from './pages/SharedNotePage';
import CollabPage from './pages/CollabPage';
import AuthSuccessPage from './pages/AuthSuccessPage';

import SectionLoader from './components/SectionLoader'; // ✅ import your loader
import './App.css';

function App() {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    enabled: authApi.isAuthenticated(),
  });

  // ✅ Show loader while auth check is running
  if (isLoading && authApi.isAuthenticated()) {
    return <SectionLoader fullScreen />;
  }

  // If no token, user is not authenticated
  const isAuthenticated = authApi.isAuthenticated() && user;

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/register"
        element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />}
      />
      <Route path="/share/:shareId" element={<SharePage />} />
      <Route path="/auth/success" element={<AuthSuccessPage />} />
      <Route
        path="/notes/shared/:shareId"
        element={isAuthenticated ? <SharedNotePage /> : <Navigate to="/login" />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/ai"
        element={isAuthenticated ? <AIPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebooks"
        element={isAuthenticated ? <NotebooksPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/notes/:noteId?"
        element={isAuthenticated ? <NotesPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/agenda/:taskId?"
        element={isAuthenticated ? <AgendaPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/tasks/:taskId?"
        element={isAuthenticated ? <TasksPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/calendar"
        element={isAuthenticated ? <CalendarPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/trash"
        element={isAuthenticated ? <TrashPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/collab"
        element={isAuthenticated ? <CollabPage /> : <Navigate to="/login" />}
      />

      {/* Catch all */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} />}
      />
    </Routes>
  );
}

export default App;
