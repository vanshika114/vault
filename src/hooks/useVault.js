import { useState, useEffect } from 'react';
import { vaultService } from '../services/vaultService';
import { storageService } from '../services/storageService';

export const useVault = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        await storageService.initDB();
        const allItems = await vaultService.getAllItems();
        setItems(allItems);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load vault');
        console.error('Error loading vault:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const addItem = async (type, title, content, description = '', tags = [], metadata = {}) => {
    try {
      const newItem = await vaultService.addItem(type, title, content, description, tags, metadata);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      setError(err.message || 'Failed to add item');
      throw err;
    }
  };

  const updateItem = async (id, updates) => {
    try {
      const updated = await vaultService.updateItem(id, updates);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update item');
      throw err;
    }
  };

  const deleteItem = async (id) => {
    try {
      await vaultService.deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const searchItems = async (query, type = 'all', sortBy = 'newest') => {
    try {
      return await vaultService.searchItems(items, query, type, sortBy);
    } catch (err) {
      setError(err.message || 'Search failed');
      throw err;
    }
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
  };
};
