import styles from './ItemCard.module.css';

const getTypeIcon = (type) => {
  switch (type) {
    case 'text':
      return '📝';
    case 'link':
      return '🔗';
    case 'image':
      return '🖼️';
    default:
      return '📌';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m ago`;
  return date.toLocaleDateString();
};

const getPreview = (item) => {
  switch (item.type) {
    case 'text':
      return item.content;
    case 'link':
      return item.metadata?.domain || item.content;
    case 'image':
      return `Image: ${item.title}`;
    default:
      return '';
  }
};

export const ItemCard = ({ item, onClick, onDelete }) => {
  const preview = getPreview(item);
  const icon = getTypeIcon(item.type);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${item.title}"?`)) {
      onDelete(item.id);
    }
  };

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <span className={styles.icon}>{icon}</span>
          <h3 className={styles.title}>{item.title}</h3>
        </div>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
          aria-label="Delete item"
        >
          ✕
        </button>
      </div>

      <p className={styles.preview}>{preview}</p>

      {item.tags && item.tags.length > 0 && (
        <div className={styles.tags}>
          {item.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.date}>{formatDate(item.createdAt)}</span>
        {item.type === 'image' && (
          <span className={styles.imageIndicator}>Image thumbnail available</span>
        )}
      </div>
    </div>
  );
};
