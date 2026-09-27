import { useState } from 'react';
import styles from './ItemDetail.module.css';

export const ItemDetail = ({ item, onUpdate, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: item.title,
    description: item.description,
    tags: item.tags.join(', '),
    content: item.type === 'text' ? item.content : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = editData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      await onUpdate(item.id, {
        title: editData.title,
        description: editData.description,
        tags,
        ...(item.type === 'text' && { content: editData.content }),
      });

      setIsEditing(false);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${item.title}" permanently?`)) {
      onDelete(item.id);
    }
  };

  const getTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{item.title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.metadata}>
          <span className={styles.badge}>{getTypeLabel(item.type)}</span>
          <span className={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        {!isEditing ? (
          <>
            {item.type === 'text' && (
              <div className={styles.content}>
                <div className={styles.textContent}>{item.content}</div>
              </div>
            )}

            {item.type === 'link' && (
              <div className={styles.content}>
                <a
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {item.content}
                </a>
              </div>
            )}

            {item.type === 'image' && (
              <div className={styles.content}>
                <img src={item.content} alt={item.title} className={styles.image} />
              </div>
            )}

            {item.description && (
              <div className={styles.section}>
                <h4>Description</h4>
                <p>{item.description}</p>
              </div>
            )}

            {item.tags.length > 0 && (
              <div className={styles.section}>
                <h4>Tags</h4>
                <div className={styles.tags}>
                  {item.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                Edit
              </button>
              {item.type === 'link' && (
                <a
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.openButton}
                >
                  Open Link
                </a>
              )}
              <button className={styles.deleteButton} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                />
              </div>

              {item.type === 'text' && (
                <div className={styles.formGroup}>
                  <label>Content</label>
                  <textarea
                    value={editData.content}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.editActions}>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
