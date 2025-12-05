import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then(res => {
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  }),
  register: (userData) => api.post('/auth/register', userData).then(res => {
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  }),
  // Email verification
  verifyEmail: (data) => api.post('/auth/verify-email', data).then(res => {
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then(res => res.data),
  // Google OAuth
  getGoogleAuthUrl: () => api.get('/auth/google/url').then(res => res.data),
  googleCallback: (code) => api.post('/auth/google/callback', { code }).then(res => {
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  }),
  googleAuth: (credential) => api.post('/auth/google', { credential }).then(res => {
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  }),
  refreshGoogleToken: () => api.post('/auth/google/refresh').then(res => res.data),
  // Session management
  logout: () => {
    localStorage.removeItem('token');
    return api.post('/auth/logout').then(res => res.data);
  },
  getCurrentUser: () => api.get('/auth/me').then(res => res.data.user),
  isAuthenticated: () => !!localStorage.getItem('token'),
  // Password reset
  sendResetOTP: (email) => api.post('/auth/send-reset-otp', { email }).then(res => res.data),
  verifyResetOTP: (data) => api.post('/auth/verify-reset-otp', data).then(res => res.data),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(res => res.data),
};

// Notes API
export const notesApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    const url = searchParams.toString() ? `/notes?${searchParams}` : '/notes';
    return api.get(url).then(res => res.data);
  },
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
  getCollabNotes: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    const url = searchParams.toString() ? `/notes/collab?${searchParams}` : '/notes/collab';
    return api.get(url).then(res => res.data);
  },
};

// Notebooks API
export const notebooksApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);
    const url = searchParams.toString() ? `/notebooks?${searchParams}` : '/notebooks';
    return api.get(url).then(res => res.data);
  },
  create: (notebookData) => api.post('/notebooks', notebookData).then(res => res.data),
  update: (id, notebookData) => api.put(`/notebooks/${id}`, notebookData).then(res => res.data),
  delete: (id) => api.post(`/notebooks/${id}/trash`).then(res => res.data),
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
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    const url = searchParams.toString() ? `/tasks?${searchParams}` : '/tasks';
    return api.get(url).then(res => res.data);
  },
  getById: (id) => api.get(`/tasks/${id}`).then(res => res.data),
  create: (taskData) => api.post('/tasks', taskData).then(res => res.data),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData).then(res => res.data),
  delete: (id) => api.post(`/tasks/${id}/trash`).then(res => res.data),
};

// Agendas API
export const agendasApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);
    const url = searchParams.toString() ? `/agendas?${searchParams}` : '/agendas';
    return api.get(url).then(res => res.data);
  },
  create: (agendaData) => api.post('/agendas', agendaData).then(res => res.data),
  update: (id, agendaData) => api.put(`/agendas/${id}`, agendaData).then(res => res.data),
  delete: (id) => api.post(`/agendas/${id}/trash`).then(res => res.data),
};

// Events API
export const eventsApi = {
  getAll: () => api.get('/events').then(res => res.data),
  create: (eventData) => api.post('/events', eventData).then(res => res.data),
  update: (id, eventData) => api.put(`/events/${id}`, eventData).then(res => res.data),
  delete: (id) => api.post(`/events/${id}/trash`).then(res => res.data),
};

// Todos API
export const todosApi = {
  getByTaskId: (taskId) => api.get(`/tasks/${taskId}/todos`).then(res => res.data),
  create: (todoData) => api.post('/todos', todoData).then(res => res.data),
  update: (id, todoData) => api.put(`/todos/${id}`, todoData).then(res => res.data),
  delete: (id) => api.delete(`/todos/${id}`).then(res => res.data),
};

export default api;