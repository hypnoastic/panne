import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import SectionLoader from '../components/SectionLoader';
import api from '../services/api';
import './TrashPage.css';

// Trash API using centralized API
const trashApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.type && params.type !== 'all') searchParams.append('type', params.type);
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);
    
    const response = await api.get(`/trash?${searchParams}`);
    return response.data;
  },
  restore: async (id) => {
    const response = await api.post(`/trash/${id}/restore`);
    return response.data;
  },
  permanentDelete: async (id) => {
    const response = await api.delete(`/trash/${id}`);
    return response.data;
  }
};

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('deleted_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const limit = 5;

  const { data: trashResponse, isFetching: searchLoading } = useQuery({
    queryKey: ['trash', currentPage, searchTerm, selectedType, dateFrom, dateTo, sortBy, sortOrder],
    queryFn: () => trashApi.getAll({
      page: currentPage,
      limit,
      search: searchTerm,
      type: selectedType,
      date_from: dateFrom,
      date_to: dateTo,
      sort: sortBy,
      order: sortOrder
    })
  });
  
  const { isLoading } = useQuery({
    queryKey: ['trash-initial'],
    queryFn: () => trashApi.getAll({ page: 1, limit }),
    enabled: !searchTerm && !dateFrom && !dateTo && currentPage === 1
  });
  
  const trashItems = trashResponse?.data || [];
  const totalPages = trashResponse?.totalPages || 1;
  const totalItems = trashResponse?.totalItems || 0;

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

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
        <SectionLoader size="lg" />
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  onClick={() => {
                    setSelectedType(type);
                    setCurrentPage(1);
                  }}
                >
                  {type === 'all' ? 'All Items' : `${type?.charAt(0).toUpperCase() + type?.slice(1) || 'Item'}s`}
                </button>
              ))}
            </div>
            <div className="trash-controls">
              <div className="trash-filters">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="trash-date-input"
                />
                <span className="trash-date-separator">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="trash-date-input"
                />
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  className="trash-sort-select"
                >
                  <option value="deleted_at-desc">Recently Deleted</option>
                  <option value="deleted_at-asc">Oldest Deleted</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="item_type-asc">Type A-Z</option>
                  <option value="item_type-desc">Type Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}



          <div className="trash-list">
            {searchLoading && (searchTerm || dateFrom || dateTo || selectedType !== 'all') ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#9CA3AF' }}>
                Searching...
              </div>
            ) : (
              <AnimatePresence>
                {trashItems.map((item) => (
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
            )}
          </div>

          {!searchLoading && trashItems.length === 0 && (
            <div className="empty-state">
              <h3 className="empty-state__title">
                {searchTerm || dateFrom || dateTo ? 'No matching items found' : selectedType === 'all' ? 'Trash is empty' : `No deleted ${selectedType}s`}
              </h3>
              <p className="empty-state__description">
                {searchTerm || dateFrom || dateTo ? 'Try adjusting your search or date filters' : 'Deleted items will appear here and can be restored within 30 days'}
              </p>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="trash-pagination">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="trash-pagination-btn"
              >
                ← Previous
              </button>
              <span className="trash-pagination-info">
                Page {currentPage} of {totalPages} ({totalItems} total)
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="trash-pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}