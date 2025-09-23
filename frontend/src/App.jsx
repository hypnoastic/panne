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
  });

  // ✅ Show loader while auth check is running
  if (isLoading) {
    return <SectionLoader fullScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={!user ? <LandingPage /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/register"
        element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />}
      />
      <Route path="/share/:shareId" element={<SharePage />} />
      <Route
        path="/notes/shared/:shareId"
        element={user ? <SharedNotePage /> : <Navigate to="/login" />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={user ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/ai"
        element={user ? <AIPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/notebooks"
        element={user ? <NotebooksPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/notes/:noteId?"
        element={user ? <NotesPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/agenda/:taskId?"
        element={user ? <AgendaPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/tasks/:taskId?"
        element={user ? <TasksPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/calendar"
        element={user ? <CalendarPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={user ? <SettingsPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/trash"
        element={user ? <TrashPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/collab"
        element={user ? <CollabPage /> : <Navigate to="/login" />}
      />

      {/* Catch all */}
      <Route
        path="*"
        element={<Navigate to={user ? '/dashboard' : '/'} />}
      />
    </Routes>
  );
}

export default App;
