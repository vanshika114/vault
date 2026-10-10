import { useState, useRef } from 'react';
import styles from './AddItemForm.module.css';

export const AddItemForm = ({ onAdd, loading }) => {
  const [mode, setMode] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setMode(null);
    setTitle('');
    setContent('');
    setDescription('');
    setTags('');
  };

  const handleAddText = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    try {
      await onAdd('text', title, content, description, tagArray);
      resetForm();
    } catch (err) {
      alert('Failed to add text: ' + err.message);
    }
  };

  const handleAddLink = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and URL');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    try {
      const urlObj = new URL(content);
      const metadata = {
        url: content,
        domain: urlObj.hostname,
      };

      await onAdd('link', title, content, description, tagArray, metadata);
      resetForm();
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be smaller than 10MB');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        const tagArray = tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t);

        const imageTitle = title.trim() || file.name.split('.')[0];

        await onAdd('image', imageTitle, base64, description, tagArray);
        resetForm();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {!mode && (
        <div className={styles.modeSelector}>
          <h2>Add to Vault</h2>
          <p className={styles.subtitle}>Save anything. Find everything.</p>
          <div className={styles.actions}>
            <button
              className={`${styles.modeButton} ${styles.primary}`}
              onClick={() => setMode('text')}
              disabled={loading}
            >
              Write
            </button>
            <button
              className={`${styles.modeButton} ${styles.secondary}`}
              onClick={() => setMode('link')}
              disabled={loading}
            >
              Paste Link
            </button>
            <button
              className={`${styles.modeButton} ${styles.tertiary}`}
              onClick={() => setMode('image')}
              disabled={loading}
            >
              Upload Image
            </button>
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className={styles.form}>
          <h3>Add Text</h3>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Your text here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className={styles.formActions}>
            <button className={styles.primaryButton} onClick={handleAddText} disabled={loading}>
              Save
            </button>
            <button className={styles.secondaryButton} onClick={resetForm} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'link' && (
        <div className={styles.form}>
          <h3>Add Link</h3>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="https://example.com"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className={styles.formActions}>
            <button className={styles.primaryButton} onClick={handleAddLink} disabled={loading}>
              Save
            </button>
            <button className={styles.secondaryButton} onClick={resetForm} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'image' && (
        <div className={styles.form}>
          <h3>Upload Image</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            ref={fileInputRef}
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} onClick={resetForm} disabled={uploading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
