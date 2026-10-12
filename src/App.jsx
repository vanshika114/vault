import { useState, useEffect } from 'react';
import { AddItemForm } from './components/AddItemForm';
import { SearchBar } from './components/SearchBar';
import { ItemCard } from './components/ItemCard';
import { ItemDetail } from './components/ItemDetail';
import CodeGate from './components/CodeGate/CodeGate';
import { useVault } from './hooks/useVault';
import { useSync } from './hooks/useSync';
import './styles/index.css';
import styles from './App.module.css';

function App() {
  const { items, loading, error, addItem, updateItem, deleteItem } = useVault();
  const {
    code,
    newCode,
    ready,
    error: syncError,
    status: syncStatus,
    lastSync,
    createVault,
    joinVault,
    syncNow,
    dismissNewCode,
  } = useSync();

  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [copyError, setCopyError] = useState('');

  // Update filtered items whenever items or filters change
  useEffect(() => {
    let results = [...items];

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
  }, [items, searchQuery, filterType, sortBy]);

  // All hooks are above this line, so early returns are safe
  if (!ready) {
    return (
      <div className={styles.loading} role="status">
        <p>Opening your vault…</p>
      </div>
    );
  }

  if (!code || newCode) {
    return (
      <CodeGate
        newCode={newCode}
        onCreate={createVault}
        onJoin={joinVault}
        onContinue={dismissNewCode}
        error={syncError}
        loading={!ready}
      />
    );
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError('');
    } catch (err) {
      setCopyError(`Unable to copy: ${err.message}`);
    }
  };

  const linkDevice = async () => {
    const link = new URL(window.location.href);
    link.hash = new URLSearchParams({ code }).toString();
    await copyText(link.toString());
  };

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
          <section className={styles.syncPanel} aria-label="Sync settings">
            <div>
              <h2>Sync</h2>
              <p className={styles.syncCode}>{code}</p>
              <p className={styles.syncMeta}>
                Last synced: {lastSync ? new Date(Number(lastSync)).toLocaleString() : 'Never'}
              </p>
            </div>
            <div className={styles.syncActions}>
              <button onClick={() => copyText(code)}>Copy code</button>
              <button onClick={linkDevice}>Link device</button>
              <button onClick={syncNow} disabled={syncStatus === 'syncing'}>
                {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
            {syncError && <p className={styles.syncError} role="alert">{syncError}</p>}
            {copyError && <p className={styles.syncError} role="alert">{copyError}</p>}
          </section>
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