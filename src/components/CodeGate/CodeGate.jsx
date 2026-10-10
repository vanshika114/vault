import { useState } from 'react';
import styles from './CodeGate.module.css';

export default function CodeGate({ onCreate, onJoin, error }) {
  const [input, setInput] = useState('');
  const [newCode, setNewCode] = useState(null);
  const [busy, setBusy] = useState(false);

  if (newCode) {
    return (
      <div className={styles.wrap}>
        <h2>Your vault code</h2>
        <p className={styles.code}>{newCode}</p>
        <p className={styles.hint}>Save this. You need it to open Vault on another device.</p>
        <button onClick={() => navigator.clipboard.writeText(newCode)}>Copy</button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2>Open your vault</h2>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="maple river quiet orbit"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        disabled={busy || !input.trim()}
        onClick={async () => { setBusy(true); await onJoin(input); setBusy(false); }}
      >
        {busy ? 'Opening…' : 'Open'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.link} onClick={async () => setNewCode(await onCreate())}>
        New here? Create a vault
      </button>
    </div>
  );
}