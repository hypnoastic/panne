import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import sectionLoader from '../assets/section_loader.json';
import './TrashPage.css';

// Mock API for trash items
const trashApi = {
  getAll: async () => {
    // Mock data - replace with actual API
    return [
      { id: 1, type: 'note', title: 'Deleted Note 1', deletedAt: new Date().toISOString() },
      { id: 2, type: 'notebook', title: 'Old Notebook', deletedAt: new Date().toISOString() },
      { id: 3, type: 'agenda', title: 'Completed Agenda', deletedAt: new Date().toISOString() },
      { id: 4, type: 'task', title: 'Old Task', deletedAt: new Date().toISOString() },
    ];
  },
  restore: async (id) => {
    // Mock restore - replace with actual API
    return { success: true };
  },
  permanentDelete: async (id) => {
    // Mock delete - replace with actual API
    return { success: true };
  }
};

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('all');

  const { data: trashItems = [], isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: trashApi.getAll
  });

  const restoreMutation = useMutation({
    mutationFn: trashApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: trashApi.permanentDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
    }
  });

  const filteredItems = selectedType === 'all' 
    ? trashItems 
    : trashItems.filter(item => item.type === selectedType);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'note':
        return '📝';
      case 'notebook':
        return '📚';
      case 'agenda':
        return '📅';
      case 'task':
        return '✅';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="trash-loading">
          <Lottie animationData={sectionLoader} style={{ width: 400, height: 400 }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="trash-page">
        <div className="trash-container">
          <div className="trash-header">
            <div className="header-content">
              <h1 className="font-h1">Trash</h1>
              <div className="current-date">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>

          <div className="filter-tabs">
            {['all', 'note', 'notebook', 'agenda', 'task'].map(type => (
              <button
                key={type}
                className={`filter-tab ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type === 'all' ? 'All Items' : `${type.charAt(0).toUpperCase() + type.slice(1)}s`}
              </button>
            ))}
          </div>

          <div className="trash-list">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="trash-item"
                >
                  <div className="item-info">
                    <div className="item-icon">{getTypeIcon(item.type)}</div>
                    <div className="item-details">
                      <h3 className="item-title">{item.title}</h3>
                      <p className="item-meta">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • 
                        Deleted {new Date(item.deletedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="item-actions">
                    <Button
                      variant="secondary"
                      onClick={() => restoreMutation.mutate(item.id)}
                      loading={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deleteMutation.mutate(item.id)}
                      loading={deleteMutation.isPending}
                    >
                      Delete Forever
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredItems.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🗑️</div>
              <h3 className="empty-state__title">
                {selectedType === 'all' ? 'Trash is empty' : `No deleted ${selectedType}s`}
              </h3>
              <p className="empty-state__description">
                Deleted items will appear here and can be restored within 30 days
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}