import { storageService } from './storageService';
import { searchService } from './searchService';
import { scheduleSync } from './syncService';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createVaultItem = (type, title, content, description = '', tags = [], metadata = {}) => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    type,
    title,
    content,
    description,
    tags,
    metadata,
    createdAt: now,
    updatedAt: now,
    dirty: true,
    deleted: false,
  };
};

const addItem = async (type, title, content, description = '', tags = [], metadata = {}) => {
  const item = createVaultItem(type, title, content, description, tags, metadata);
  const added = await storageService.addItem(item);
  scheduleSync();
  return added;
};

const updateItem = async (id, updates) => {
  const item = await storageService.getItemById(id);
  if (!item) throw new Error('Item not found');

  const updated = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
    dirty: true,
    deleted: false,
  };

  const saved = await storageService.updateItem(updated);
  scheduleSync();
  return saved;
};

const deleteItem = async (id) => {
  const deleted = await storageService.deleteItem(id);
  scheduleSync();
  return deleted;
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
