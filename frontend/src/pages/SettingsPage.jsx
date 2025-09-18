import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { authApi, usersApi, uploadApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import './SettingsPage.css';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState({
    autoSave: true,
    realTimeCollab: true,
    aiSuggestions: true
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    onSuccess: (data) => {
      setProfileData({
        name: data.name || '',
        email: data.email || '',
        avatar_url: data.avatar_url || '',
        locale: data.locale || 'en-US',
        timezone: data.timezone || 'UTC'
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data);
      alert('Profile updated successfully!');
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: usersApi.updatePassword,
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert('Password updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update password');
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: usersApi.updatePreferences,
    onSuccess: () => {
      alert('Preferences updated successfully!');
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadApi.image,
    onSuccess: (data) => {
      setProfileData(prev => ({ ...prev, avatar_url: data.url }));
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
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handlePreferencesChange = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  const handleAvatarUpload = (e) => {
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="settings-loading">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="settings-page">
        <div className="settings-container">
          <div className="settings-header">
            <h1>Settings</h1>
            <p>Manage your account settings and preferences</p>
          </div>

          <div className="settings-content">
            <div className="settings-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="settings-tab__icon">{tab.icon}</span>
                  <span className="settings-tab__label">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="settings-panel">
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settings-section"
                >
                  <h2>Profile Information</h2>
                  <p>Update your personal information and profile picture</p>

                  <form onSubmit={handleProfileSubmit} className="settings-form">
                    <div className="avatar-section">
                      <div className="avatar-preview">
                        {profileData.avatar_url ? (
                          <img src={profileData.avatar_url} alt="Avatar" />
                        ) : (
                          <span>{user?.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="avatar-actions">
                        <label className="avatar-upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            style={{ display: 'none' }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={uploadAvatarMutation.isPending}
                          >
                            Upload Photo
                          </Button>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={profileData.name || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={profileData.email || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={profileData.locale || 'en-US'}
                        onChange={(e) => setProfileData(prev => ({ ...prev, locale: e.target.value }))}
                        className="form-input"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Timezone</label>
                      <select
                        value={profileData.timezone || 'UTC'}
                        onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                        className="form-input"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      loading={updateProfileMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settings-section"
                >
                  <h2>Security Settings</h2>
                  <p>Update your password and security preferences</p>

                  <form onSubmit={handlePasswordSubmit} className="settings-form">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      loading={updatePasswordMutation.isPending}
                    >
                      Update Password
                    </Button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="settings-section"
                >
                  <h2>Preferences</h2>
                  <p>Customize your workspace experience</p>

                  <div className="settings-form">
                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Auto-save</h4>
                        <p>Automatically save your notes as you type</p>
                      </div>
                      <label className="toggle">
                        <input 
                          type="checkbox" 
                          checked={preferences.autoSave}
                          onChange={(e) => handlePreferencesChange('autoSave', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Real-time collaboration</h4>
                        <p>Show live cursors and presence indicators</p>
                      </div>
                      <label className="toggle">
                        <input 
                          type="checkbox" 
                          checked={preferences.realTimeCollab}
                          onChange={(e) => handlePreferencesChange('realTimeCollab', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>AI suggestions</h4>
                        <p>Get writing suggestions and improvements</p>
                      </div>
                      <label className="toggle">
                        <input 
                          type="checkbox" 
                          checked={preferences.aiSuggestions}
                          onChange={(e) => handlePreferencesChange('aiSuggestions', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
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