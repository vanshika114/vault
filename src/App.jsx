import { useState, useEffect } from 'react';
import { AddItemForm } from './components/AddItemForm';
import { SearchBar } from './components/SearchBar';
import { ItemCard } from './components/ItemCard';
import { ItemDetail } from './components/ItemDetail';
import { useVault } from './hooks/useVault';
import './styles/index.css';
import styles from './App.module.css';

function App() {
  const { items, loading, error, addItem, updateItem, deleteItem, searchItems } = useVault();
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Update filtered items whenever items or filters change
  useEffect(() => {
    const filterAndSort = () => {
      let results = items;

      // Filter by type
      if (filterType !== 'all') {
        results = results.filter((item) => item.type === filterType);
      }

      // Search if query provided
      if (searchQuery.trim()) {
        results = results.filter((item) => {
          const searchText = [
            item.title,
            item.description,
            item.content,
            item.metadata?.url,
            item.metadata?.domain,
            item.metadata?.ocrText,
          ]
            .join(' ')
            .toLowerCase();
          return searchText.includes(searchQuery.toLowerCase());
        });
      }

      // Sort
      if (sortBy === 'newest') {
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sortBy === 'oldest') {
        results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }

      setFilteredItems(results);
    };

    filterAndSort();
  }, [items, searchQuery, filterType, sortBy]);

  const handleSearch = async (query, type, sort) => {
    setSearchQuery(query);
    setFilterType(type);
    setSortBy(sort);
  };

  const handleAddItem = async (type, title, content, description, tags, metadata) => {
    try {
      await addItem(type, title, content, description, tags, metadata);
    } catch (err) {
      console.error('Error adding item:', err);
      throw err;
    }
  };

  const handleUpdateItem = async (id, updates) => {
    try {
      await updateItem(id, updates);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteItem(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Vault</h1>
          <p className={styles.tagline}>Save anything. Find everything.</p>
        </div>
      </header>

      <main className={styles.main}>
        {error && <div className={styles.error}>Error: {error}</div>}

        {loading ? (
          <div className={styles.loading}>
            <p>Loading vault...</p>
          </div>
        ) : (
          <>
            <AddItemForm onAdd={handleAddItem} loading={loading} />

            <SearchBar
              onSearch={handleSearch}
              onTypeChange={(e) => handleSearch(searchQuery, e.target.value, sortBy)}
              onSortChange={(e) => handleSearch(searchQuery, filterType, e.target.value)}
            />

            {filteredItems.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyIcon}>📦</p>
                <h3>Nothing here yet</h3>
                <p>Add your first item to get started</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onUpdate={handleUpdateItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDeleteItem}
        />
      )}
    </div>
  );
}

export default App;
