import { useEffect, useState, useCallback } from 'react';
import { generateCode, normalizeCode, isValidCode } from '../services/codeService';
import { initSync, sync, startAutoSync } from '../services/syncService';
import { getMeta, setMeta } from '../services/storageService';

let autoStarted = false;

export function useSync() {
  const [code, setCode] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const start = useCallback(async (c) => {
    await initSync(c);
    await sync();
    if (!autoStarted) { startAutoSync(); autoStarted = true; }
    setCode(c);
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await getMeta('vaultCode');
      if (saved) await start(saved);
      setReady(true);
    })();
  }, [start]);

  const createVault = async () => {
    const c = generateCode();
    await setMeta('vaultCode', c);
    await start(c);
    return c;
  };

  const joinVault = async (input) => {
    const c = normalizeCode(input);
    if (!isValidCode(c)) { setError('Check the code, it should be 4 words.'); return false; }
    await setMeta('vaultCode', c);
    await start(c);
    return true;
  };

  return { code, ready, error, createVault, joinVault };
}