import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.notes': 'Notes',
      'nav.settings': 'Settings',
      'nav.trash': 'Trash',
      'nav.logout': 'Logout',
      
      // Authentication
      'auth.login': 'Login',
      'auth.register': 'Sign Up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.name': 'Full Name',
      'auth.confirmPassword': 'Confirm Password',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.noAccount': "Don't have an account?",
      'auth.hasAccount': 'Already have an account?',
      
      // Dashboard
      'dashboard.welcome': 'Welcome back, {{name}}!',
      'dashboard.quickActions': 'Quick Actions',
      'dashboard.createNote': 'Create Note',
      'dashboard.createNotebook': 'Create Notebook',
      'dashboard.recentNotes': 'Recent Notes',
      'dashboard.noNotes': 'Your workspace awaits!',
      'dashboard.createFirst': 'Create your first note',
      
      // Notes
      'notes.untitled': 'Untitled',
      'notes.save': 'Save',
      'notes.saving': 'Saving...',
      'notes.saved': 'Saved',
      'notes.share': 'Share',
      'notes.versions': 'Versions',
      'notes.delete': 'Delete',
      'notes.restore': 'Restore',
      'notes.ai': 'AI Assistant',
      
      // AI
      'ai.summarize': 'Summarize',
      'ai.improve': 'Improve Writing',
      'ai.tone': 'Change Tone',
      'ai.actions': 'Extract Actions',
      'ai.prompt': 'Ask AI anything...',
      
      // Settings
      'settings.profile': 'Profile',
      'settings.ai': 'AI Settings',
      'settings.preferences': 'Preferences',
      'settings.updateProfile': 'Update Profile',
      'settings.changePassword': 'Change Password',
      'settings.geminiKey': 'Gemini API Key',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.retry': 'Retry',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.create': 'Create',
      'common.update': 'Update'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;