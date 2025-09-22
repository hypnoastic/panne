import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import { authApi } from '../services/api';
import './SettingsPage.css';

const settingsApi = {
  updateProfile: async (data) => {
    const response = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },
  changePassword: async (data) => {
    const response = await fetch('http://localhost:5000/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to change password');
    return response.json();
  },
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch('http://localhost:5000/api/auth/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload avatar');
    return response.json();
  }
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    language: 'en'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    onSuccess: (data) => {
      setProfileData({
        name: data.name || '',
        email: data.email || '',
        language: data.language || 'en'
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['auth', 'me']);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: settingsApi.uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries(['auth', 'me']);
    }
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
  ];

  return (
    <AppLayout>
      <div className="settingspage-settings-page">
        <div className="settingspage-settings-container">
          <div className="settingspage-settings-header">
            <h1 className="font-h1">Settings</h1>
          </div>

          <div className="settingspage-settings-layout">
            <div className="settingspage-settings-sidebar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`settingspage-settings-tab ${activeTab === tab.id ? 'settingspage-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="settingspage-tab-icon">{tab.icon}</span>
                  <span className="settingspage-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="settingspage-settings-content">
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settingspage-settings-section"
                >
                  <h2>Profile Information</h2>
                  
                  <div className="settingspage-avatar-section">
                    <div className="settingspage-avatar-preview">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" />
                      ) : (
                        <span>{user?.name?.charAt(0)?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="settingspage-avatar-actions">
                      <label className="settingspage-avatar-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          hidden
                        />
                        <Button loading={uploadAvatarMutation.isPending}>
                          Change Photo
                        </Button>
                      </label>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="settingspage-settings-form">
                    <div className="settingspage-form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className="settingspage-form-input"
                      />
                    </div>

                    <div className="settingspage-form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="settingspage-form-input"
                      />
                    </div>

                    <div className="settingspage-form-group">
                      <label>Language</label>
                      <select
                        value={profileData.language}
                        onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                        className="settingspage-form-select"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <Button type="submit" loading={updateProfileMutation.isPending}>
                      Save Changes
                    </Button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settingspage-settings-section"
                >
                  <h2>Security Settings</h2>
                  
                  <form onSubmit={handlePasswordSubmit} className="settingspage-settings-form">
                    <div className="settingspage-form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="settingspage-form-input"
                      />
                    </div>

                    <div className="settingspage-form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="settingspage-form-input"
                      />
                    </div>

                    <div className="settingspage-form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="settingspage-form-input"
                      />
                    </div>

                    <Button type="submit" loading={changePasswordMutation.isPending}>
                      Change Password
                    </Button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settingspage-settings-section"
                >
                  <h2>Preferences</h2>
                  
                  <div className="settingspage-preference-group">
                    <h3>Notifications</h3>
                    <div className="settingspage-preference-item">
                      <label className="settingspage-checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Email notifications</span>
                      </label>
                    </div>
                    <div className="settingspage-preference-item">
                      <label className="settingspage-checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Push notifications</span>
                      </label>
                    </div>
                  </div>

                  <div className="settingspage-preference-group">
                    <h3>Editor</h3>
                    <div className="settingspage-preference-item">
                      <label className="settingspage-checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span>Auto-save</span>
                      </label>
                    </div>
                    <div className="settingspage-preference-item">
                      <label className="settingspage-checkbox-label">
                        <input type="checkbox" />
                        <span>Spell check</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}