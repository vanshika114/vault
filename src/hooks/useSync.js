import { useCallback, useEffect, useState } from 'react';
import { generateCode, isValidCode, normalizeCode } from '../services/codeService';
import { getLastSync, initSync, startAutoSync, sync } from '../services/syncService';
import { storageService } from '../services/storageService';

function codeFromFragment() {
  const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
  if (!code) return null;
  const normalized = normalizeCode(code);
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  return isValidCode(normalized) ? normalized : null;
}

export function useSync() {
  const [code, setCode] = useState(null);
  const [newCode, setNewCode] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);

  const openVault = useCallback(async (vaultCode, requireRemoteItems = false) => {
    await initSync(vaultCode);
    const result = await sync();
    if (requireRemoteItems && result.error) throw new Error(result.error);
    if (requireRemoteItems && result.pulled === 0) {
      throw new Error('No items found, check your code');
    }

    setCode(vaultCode);
    const syncedAt = result.lastSync || (await getLastSync());
    if (syncedAt) setLastSync(syncedAt);
    startAutoSync();
    return result;
  }, []);

  useEffect(() => {
    const onStatus = (event) => {
      const detail = event.detail;
      setStatus(detail.status);
      setError(detail.error || '');
      if (detail.lastSync) setLastSync(detail.lastSync);
    };
    window.addEventListener('vault-sync-status', onStatus);
    return () => window.removeEventListener('vault-sync-status', onStatus);
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await storageService.initDB();
        const saved = await storageService.getMeta('vaultCode');
        if (saved) {
          await openVault(saved);
        } else {
          const linkedCode = codeFromFragment();
          if (linkedCode) {
            await openVault(linkedCode, true);
            await storageService.setMeta('vaultCode', linkedCode);
          }
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to initialize sync');
      } finally {
        if (active) setReady(true);
      }
    };
    initialize();
    return () => {
      active = false;
    };
  }, [openVault]);

  const createVault = async () => {
    const vaultCode = generateCode();
    await storageService.initDB();
    await storageService.setMeta('vaultCode', vaultCode);
    setError('');
    await openVault(vaultCode);
    setNewCode(vaultCode);
  };

  const joinVault = async (input) => {
    const vaultCode = normalizeCode(input);
    if (!isValidCode(vaultCode)) {
      setError('Check the code, it should be 4 words.');
      return false;
    }
    setError('');
    try {
      const result = await openVault(vaultCode, true);
      await storageService.setMeta('vaultCode', vaultCode);
      return !result.error;
    } catch (err) {
      setError(err.message || 'Unable to open this vault');
      return false;
    }
  };

  const syncNow = async () => {
    const result = await sync();
    if (result.error) setError(result.error);
    else if (result.lastSync) setLastSync(result.lastSync);
    return result;
  };

  return {
    code,
    newCode,
    ready,
    error,
    status,
    lastSync,
    createVault,
    joinVault,
    syncNow,
    dismissNewCode: () => setNewCode(null),
  };
}
