import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import sectionLoader from '../assets/section_loader.json';
import './TrashPage.css';

// Trash API
const trashApi = {
  getAll: async (search = '', type = 'all') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type !== 'all') params.append('type', type);
    
    const response = await fetch(`http://localhost:5000/api/trash?${params}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch trash items');
    return response.json();
  },
  restore: async (id) => {
    const response = await fetch(`http://localhost:5000/api/trash/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to restore item');
    }
    return response.json();
  },
  permanentDelete: async (id) => {
    const response = await fetch(`http://localhost:5000/api/trash/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete item');
    return response.json();
  }
};

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: trashItems = [], isLoading } = useQuery({
    queryKey: ['trash', searchTerm, selectedType],
    queryFn: () => trashApi.getAll(searchTerm, selectedType)
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id }) => trashApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
      setErrorMessage('');
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => trashApi.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
      setErrorMessage('');
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  const filteredItems = trashItems;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'note':
        return 'N';
      case 'notebook':
        return 'NB';
      case 'agenda':
        return 'A';
      case 'task':
        return 'T';
      case 'event':
        return 'E';
      case 'chat':
        return 'C';
      default:
        return '?';
    }
  };

  const handleRestore = (item) => {
    setErrorMessage('');
    restoreMutation.mutate({ id: item.id });
  };

  const handleDelete = (item) => {
    setErrorMessage('');
    deleteMutation.mutate({ id: item.id });
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
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search trash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          <div className="search-and-filters">
            <div className="filter-tabs">
              {['all', 'note', 'notebook', 'agenda', 'task', 'event', 'chat'].map(type => (
                <button
                  key={type}
                  className={`filter-tab ${selectedType === type ? 'active' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type === 'all' ? 'All Items' : `${type?.charAt(0).toUpperCase() + type?.slice(1) || 'Item'}s`}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

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
                    <div className="item-details">
                      <h3 className="item-title">{item.title}</h3>
                      <p className="item-meta">
                        {item.item_type?.charAt(0).toUpperCase() + item.item_type?.slice(1) || 'Item'} • 
                        Deleted {new Date(item.deleted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="item-actions">
                    <Button
                      variant="secondary"
                      onClick={() => handleRestore(item)}
                      loading={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(item)}
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
              <h3 className="empty-state__title">
                {searchTerm ? 'No matching items found' : selectedType === 'all' ? 'Trash is empty' : `No deleted ${selectedType}s`}
              </h3>
              <p className="empty-state__description">
                {searchTerm ? 'Try adjusting your search terms' : 'Deleted items will appear here and can be restored within 30 days'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}