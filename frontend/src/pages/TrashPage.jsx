import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '../services/api';
import AppLayout from '../components/AppLayout';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import './TrashPage.css';

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const { data: trashedNotes = [], isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: usersApi.getTrash
  });

  const restoreMutation = useMutation({
    mutationFn: usersApi.restoreFromTrash,
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
      queryClient.invalidateQueries(['notes']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.permanentDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(['trash']);
      setShowConfirmDialog(false);
      setItemToDelete(null);
    }
  });

  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === trashedNotes.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(trashedNotes.map(note => note.id)));
    }
  };

  const handleBulkRestore = () => {
    selectedItems.forEach(itemId => {
      restoreMutation.mutate(itemId);
    });
    setSelectedItems(new Set());
  };

  const handleBulkDelete = () => {
    selectedItems.forEach(itemId => {
      deleteMutation.mutate(itemId);
    });
    setSelectedItems(new Set());
  };

  const handlePermanentDelete = (item) => {
    setItemToDelete(item);
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="trash-loading">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="trash-page">
        <div className="trash-container">
          <div className="trash-header">
            <div className="trash-title">
              <h1>Trash</h1>
              <p>Items in trash will be permanently deleted after 30 days</p>
            </div>
            
            {selectedItems.size > 0 && (
              <div className="bulk-actions">
                <Button
                  variant="secondary"
                  onClick={handleBulkRestore}
                  loading={restoreMutation.isPending}
                >
                  Restore Selected ({selectedItems.size})
                </Button>
                <Button
                  variant="danger"
                  onClick={handleBulkDelete}
                  loading={deleteMutation.isPending}
                >
                  Delete Forever ({selectedItems.size})
                </Button>
              </div>
            )}
          </div>

          {trashedNotes.length > 0 && (
            <div className="trash-controls">
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={selectedItems.size === trashedNotes.length}
                  onChange={handleSelectAll}
                />
                <span>Select All ({trashedNotes.length})</span>
              </label>
            </div>
          )}

          <div className="trash-content">
            {trashedNotes.length === 0 ? (
              <div className="empty-trash">
                <div className="empty-state">
                  <div className="empty-state__icon">🗑️</div>
                  <h3 className="empty-state__title">Trash is empty</h3>
                  <p className="empty-state__description">
                    Deleted notes will appear here. You can restore them or delete them permanently.
                  </p>
                </div>
              </div>
            ) : (
              <div className="trash-items">
                <AnimatePresence>
                  {trashedNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="trash-item"
                    >
                      <div className="trash-item__select">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(note.id)}
                          onChange={() => handleSelectItem(note.id)}
                        />
                      </div>
                      
                      <div className="trash-item__content">
                        <h4 className="trash-item__title">{note.title}</h4>
                        <p className="trash-item__preview">
                          {note.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                        </p>
                        <div className="trash-item__meta">
                          {note.notebook_name && (
                            <span className="trash-item__notebook">
                              📁 {note.notebook_name}
                            </span>
                          )}
                          <span className="trash-item__deleted">
                            Deleted {new Date(note.deleted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="trash-item__actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => restoreMutation.mutate(note.id)}
                          loading={restoreMutation.isPending}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handlePermanentDelete(note)}
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {showConfirmDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="dialog-overlay"
              onClick={() => setShowConfirmDialog(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="dialog__header">
                  <h3>Delete Forever</h3>
                </div>
                <div className="dialog__content">
                  <p>
                    Are you sure you want to permanently delete "{itemToDelete?.title}"? 
                    This action cannot be undone.
                  </p>
                </div>
                <div className="dialog__actions">
                  <Button
                    variant="secondary"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmDelete}
                    loading={deleteMutation.isPending}
                  >
                    Delete Forever
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}