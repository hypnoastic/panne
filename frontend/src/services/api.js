import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Handle unauthorized access, but avoid redirect loops
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then(res => res.data),
  register: (userData) => api.post('/auth/register', userData).then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data),
  getCurrentUser: () => api.get('/auth/me').then(res => res.data.user),
};

// Notes API
export const notesApi = {
  getAll: () => api.get('/notes').then(res => res.data),
  getById: (id) => api.get(`/notes/${id}`).then(res => res.data),
  create: (noteData) => api.post('/notes', noteData).then(res => res.data),
  update: (id, noteData) => api.put(`/notes/${id}`, noteData).then(res => res.data),
  delete: (id) => api.post(`/notes/${id}/trash`).then(res => res.data),
  getVersions: (id) => api.get(`/notes/${id}/versions`).then(res => res.data),
  restoreVersion: (noteId, versionId) => 
    api.post(`/notes/${noteId}/versions/${versionId}/restore`).then(res => res.data),
  getCollaborators: (id) => api.get(`/notes/${id}/collaborators`).then(res => res.data),
  addCollaborator: (id, collaboratorData) => 
    api.post(`/notes/${id}/collaborators`, collaboratorData).then(res => res.data),
  createShareLink: (id, shareData) => 
    api.post(`/notes/${id}/share`, shareData).then(res => res.data),
  getSharedNote: (shareId) => api.get(`/notes/shared/${shareId}`).then(res => res.data),
  requestPermission: (id, requestData) => 
    api.post(`/notes/${id}/request-permission`, requestData).then(res => res.data),
  respondToPermission: (requestId, responseData) => 
    api.post(`/permissions/${requestId}/respond`, responseData).then(res => res.data),
  getPermissionRequests: () => 
    api.get('/permissions').then(res => res.data),
  getCollabNotes: () => 
    api.get('/notes/collab').then(res => res.data),
};

// Notebooks API
export const notebooksApi = {
  getAll: () => api.get('/notebooks').then(res => res.data),
  create: (notebookData) => api.post('/notebooks', notebookData).then(res => res.data),
  update: (id, notebookData) => api.put(`/notebooks/${id}`, notebookData).then(res => res.data),
  delete: (id) => api.delete(`/notebooks/${id}`).then(res => res.data),
};

// AI API
export const aiApi = {
  query: (queryData) => api.post('/ai/query', queryData).then(res => res.data),
  getChats: () => api.get('/ai/chats').then(res => res.data),
  createChat: (chatData) => api.post('/ai/chats', chatData).then(res => res.data),
  deleteChat: (id) => api.delete(`/ai/chats/${id}`).then(res => res.data),
};

// Upload API
export const uploadApi = {
  image: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  getSignature: (folder) => api.post('/upload/signature', { folder }).then(res => res.data),
};

// Users API
export const usersApi = {
  updateProfile: (profileData) => api.put('/users/profile', profileData).then(res => res.data),
  updatePassword: (passwordData) => api.put('/users/password', passwordData).then(res => res.data),
  updatePreferences: (preferencesData) => api.put('/users/preferences', preferencesData).then(res => res.data),
  getTrash: () => api.get('/users/trash').then(res => res.data),
  restoreFromTrash: (id) => api.post(`/users/trash/${id}/restore`).then(res => res.data),
  permanentDelete: (id) => api.delete(`/users/trash/${id}`).then(res => res.data),
};

// Notifications API
export const notificationsApi = {
  getUnread: () => api.get('/notifications/unread').then(res => res.data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`).then(res => res.data),
};

// Tasks API
export const tasksApi = {
  getAll: () => api.get('/tasks').then(res => res.data),
  create: (taskData) => api.post('/tasks', taskData).then(res => res.data),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData).then(res => res.data),
  delete: (id) => api.post(`/tasks/${id}/trash`).then(res => res.data),
};

// Agendas API
export const agendasApi = {
  getAll: () => api.get('/agendas').then(res => res.data),
  create: (agendaData) => api.post('/agendas', agendaData).then(res => res.data),
  update: (id, agendaData) => api.put(`/agendas/${id}`, agendaData).then(res => res.data),
  delete: (id) => api.delete(`/agendas/${id}`).then(res => res.data),
};

// Events API
export const eventsApi = {
  getAll: () => api.get('/events').then(res => res.data),
  create: (eventData) => api.post('/events', eventData).then(res => res.data),
  update: (id, eventData) => api.put(`/events/${id}`, eventData).then(res => res.data),
  delete: (id) => api.post(`/events/${id}/trash`).then(res => res.data),
};

export default api;