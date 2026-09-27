import { storageService } from './storageService';
import { searchService } from './searchService';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createVaultItem = (type, title, content, description = '', tags = [], metadata = {}) => {
  return {
    id: generateId(),
    type,
    title,
    content,
    description,
    tags,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const addItem = async (type, title, content, description = '', tags = [], metadata = {}) => {
  const item = createVaultItem(type, title, content, description, tags, metadata);
  return storageService.addItem(item);
};

const updateItem = async (id, updates) => {
  const item = await storageService.getItemById(id);
  if (!item) throw new Error('Item not found');

  const updated = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return storageService.updateItem(updated);
};

const deleteItem = async (id) => {
  return storageService.deleteItem(id);
};

const getAllItems = async () => {
  return storageService.getAllItems();
};

const getItemById = async (id) => {
  return storageService.getItemById(id);
};

const searchItems = async (items, query, type = 'all', sortBy = 'newest') => {
  let results = items;

  // Filter by type
  results = searchService.filterItems(results, type);

  // Search if query provided
  if (query.trim()) {
    results = results.filter((item) => searchService.searchInItem(item, query));
  }

  // Sort
  results = searchService.sortItems(results, sortBy);

  return results;
};

export const vaultService = {
  addItem,
  updateItem,
  deleteItem,
  getAllItems,
  getItemById,
  searchItems,
};
