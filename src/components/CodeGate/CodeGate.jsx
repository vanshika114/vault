import { useState } from 'react';
import styles from './CodeGate.module.css';

export default function CodeGate({ newCode, onCreate, onJoin, onContinue, error, loading }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState('');

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(newCode);
    } catch (err) {
      setLocalError(`Unable to copy code: ${err.message}`);
    }
  };

  if (newCode) {
    return (
      <div className={styles.wrap}>
        <h2>Your vault code</h2>
        <p className={styles.code}>{newCode}</p>
        <p className={styles.hint}>Save this. You need it to open Vault on another device.</p>
        <button onClick={copyCode}>Copy</button>
        {(error || localError) && <p className={styles.error}>{error || localError}</p>}
        <button onClick={onContinue}>Continue</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.wrap} role="status">
        <h2>Opening your vault</h2>
        <p className={styles.hint}>Preparing secure storage on this device…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2>Open your vault</h2>
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setLocalError('');
        }}
        placeholder="maple river quiet orbit"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        disabled={busy || creating || !input.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await onJoin(input);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Opening…' : 'Open'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <button
        className={styles.link}
        disabled={busy || creating}
        onClick={async () => {
          setCreating(true);
          try {
            await onCreate();
          } catch (err) {
            setLocalError(err.message || 'Unable to create a vault');
          } finally {
            setCreating(false);
          }
        }}
      >
        {creating ? 'Creating secure vault…' : 'New here? Create a vault'}
      </button>
      {localError && <p className={styles.error}>{localError}</p>}
    </div>
  );
}