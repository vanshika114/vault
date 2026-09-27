import { useState } from 'react';
import styles from './SearchBar.module.css';

export const SearchBar = ({ onSearch, onTypeChange, onSortChange }) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery, type, sortBy);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setType(newType);
    onSearch(query, newType, sortBy);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);
    onSearch(query, type, newSort);
  };

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="Search vault..."
        value={query}
        onChange={handleQueryChange}
        className={styles.searchInput}
      />

      <div className={styles.filters}>
        <select value={type} onChange={handleTypeChange} className={styles.select}>
          <option value="all">All</option>
          <option value="text">Text</option>
          <option value="link">Links</option>
          <option value="image">Images</option>
        </select>

        <select value={sortBy} onChange={handleSortChange} className={styles.select}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
    </div>
  );
};
