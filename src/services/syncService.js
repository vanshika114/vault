import { decryptBlob, decryptItem, deriveVault, encryptBlob, encryptItem } from './cryptoService';
import { storageService as storage } from './storageService';

const API = (import.meta.env.VITE_SYNC_URL || '').replace(/\/+$/, '');
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_RECORD_BYTES = 900 * 1024;
const MAX_PUSH_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

let session = null;
let scheduleTimer = null;
let retryTimer = null;
let retryAttempt = 0;
let nextRetryAt = 0;
let syncPromise = null;
let syncRequested = false;
let autoStarted = false;

const timestamp = (item) => Date.parse(item.updatedAt || item.createdAt);

function report(status, error = '', lastSync = null) {
  window.dispatchEvent(
    new CustomEvent('vault-sync-status', { detail: { status, error, lastSync } })
  );
}

async function requestError(response, action) {
  const body = await response.text();
  let message = `${action} failed (${response.status})`;
  if (body) {
    try {
      message = JSON.parse(body).error || message;
    } catch {
      message = body.slice(0, 200) || message;
    }
  }
  return new Error(message);
}

async function requireOk(response, action) {
  if (!response.ok) throw await requestError(response, action);
  return response;
}

async function uploadImage(key, vaultId, item) {
  const { blob, mimeType } = await encryptBlob(key, item.content);
  if (blob.byteLength > MAX_IMAGE_BYTES + 28) {
    throw new Error('Image exceeds the 10 MB sync limit');
  }
  const response = await fetch(`${API}/v/${vaultId}/blob/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: blob,
  });
  await requireOk(response, `Image upload for "${item.title}"`);
  return mimeType;
}

async function pushDirty(key, vaultId, dirty) {
  const errors = [];
  const prepared = [];
  let pushed = 0;
  for (const item of dirty) {
    try {
      const serverItem = { ...item, dirty: false };
      if (item.type === 'image') {
        if (!item.deleted) {
          if (item.content?.startsWith('data:')) {
            serverItem.metadata = {
              ...item.metadata,
              imageBlob: true,
              mimeType: await uploadImage(key, vaultId, item),
            };
          } else if (item.metadata?.imageBlob) {
            serverItem.metadata = { ...item.metadata, imageBlob: true };
          }
        }
        serverItem.content = '';
      }

      const encrypted = await encryptItem(key, serverItem);
      const record = { id: item.id, updatedAt: timestamp(item), ...encrypted };
      const json = JSON.stringify(record);
      const size = new TextEncoder().encode(json).byteLength;
      if (!Number.isFinite(record.updatedAt) || size > MAX_RECORD_BYTES) {
        throw new Error(`Item "${item.title}" exceeds the sync record size limit`);
      }
      prepared.push({ item, record, size });
    } catch (error) {
      errors.push(`${item.title}: ${error.message}`);
    }
  }

  let batch = [];
  let batchSize = 2;
  const batches = [];
  for (const entry of prepared) {
    if (batch.length && batchSize + entry.size > MAX_PUSH_BYTES) {
      batches.push(batch);
      batch = [];
      batchSize = 2;
    }
    batch.push(entry);
    batchSize += entry.size + 1;
  }
  if (batch.length) batches.push(batch);

  for (const entries of batches) {
    try {
      const response = await fetch(`${API}/v/${vaultId}/push`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(entries.map(({ record }) => record)),
      });
      await requireOk(response, 'Vault upload');
      await storage.markClean(
        entries.map(({ item }) => ({ id: item.id, updatedAt: item.updatedAt }))
      );
      pushed += entries.length;
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { pushed, errors };
}

async function pullUpdates(key, vaultId, since) {
  const response = await fetch(`${API}/v/${vaultId}?since=${encodeURIComponent(since)}`);
  await requireOk(response, 'Vault download');
  const result = await response.json();
  if (!Array.isArray(result.records) || !Number.isFinite(result.now)) {
    throw new Error('The sync server returned an invalid response');
  }

  const errors = [];
  let pulled = 0;
  let changed = false;
  for (const record of result.records) {
    try {
      const local = await storage.getRaw(record.id);
      const localTime = local ? timestamp(local) : Number.NEGATIVE_INFINITY;
      if (local && Number.isFinite(localTime) && localTime >= record.updatedAt) continue;

      const item = await decryptItem(key, record);
      if (item.type === 'image' && item.metadata?.imageBlob && !item.deleted) {
        const blobResponse = await fetch(
          `${API}/v/${vaultId}/blob/${encodeURIComponent(item.id)}`
        );
        await requireOk(blobResponse, `Image download for "${item.title}"`);
        item.content = await decryptBlob(key, await blobResponse.blob(), item.metadata.mimeType);
      }
      item.updatedAt = item.updatedAt || new Date(record.updatedAt).toISOString();
      item.dirty = false;
      item.deleted = Boolean(item.deleted);
      await storage.putRaw(item);
      changed = true;
      pulled += 1;
    } catch (error) {
      errors.push(`Could not download an item: ${error.message}`);
    }
  }
  if (changed) window.dispatchEvent(new Event('vault-synced'));
  return { pulled, now: result.now, errors };
}

async function performSync() {
  report('syncing');
  try {
    if (!API) throw new Error('Sync is not configured. Set VITE_SYNC_URL to your sync Worker URL.');
    const { vaultId, key } = session;
    const dirty = await storage.getDirty();
    const push = dirty.length ? await pushDirty(key, vaultId, dirty) : { pushed: 0, errors: [] };
    const since = (await storage.getMeta(`lastSync:${vaultId}`)) ?? 0;
    const pull = await pullUpdates(key, vaultId, since);
    const errors = [...push.errors, ...pull.errors];
    if (!pull.errors.length) await storage.setMeta(`lastSync:${vaultId}`, pull.now);
    const lastSync = pull.errors.length ? since : pull.now;

    if (errors.length) {
      const message = errors.join('; ');
      report('error', message, lastSync);
      scheduleRetry();
      return { pulled: pull.pulled, pushed: push.pushed, error: message, lastSync };
    }
    retryAttempt = 0;
    nextRetryAt = 0;
    clearTimeout(retryTimer);
    report('synced', '', lastSync);
    return { pulled: pull.pulled, pushed: push.pushed, lastSync };
  } catch (error) {
    report('error', error.message);
    scheduleRetry();
    return { pulled: 0, pushed: 0, error: error.message };
  }
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  const delay = Math.min(1000 * 2 ** retryAttempt, 5 * 60 * 1000);
  retryAttempt += 1;
  nextRetryAt = Date.now() + delay;
  retryTimer = setTimeout(() => sync(), delay);
}

export async function initSync(code) {
  session = await deriveVault(code);
}

export async function getLastSync() {
  if (!session) return null;
  return (await storage.getMeta(`lastSync:${session.vaultId}`)) ?? null;
}

export function sync() {
  if (!session) return Promise.resolve({ error: 'Vault sync has not been initialized' });
  if (!navigator.onLine) {
    const error = 'You are offline. Sync will resume when the connection returns.';
    report('error', error);
    return Promise.resolve({ error });
  }
  if (Date.now() < nextRetryAt) return Promise.resolve({ error: 'Sync retry is scheduled' });
  if (syncPromise) {
    syncRequested = true;
    return syncPromise;
  }
  syncPromise = performSync().finally(() => {
    syncPromise = null;
    if (syncRequested) {
      syncRequested = false;
      if (Date.now() >= nextRetryAt) setTimeout(() => sync(), 0);
    }
  });
  return syncPromise;
}

export function scheduleSync(delay = 1500) {
  clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => sync(), delay);
}

export function startAutoSync() {
  if (autoStarted) return;
  autoStarted = true;
  window.addEventListener('focus', () => sync());
  window.addEventListener('online', () => sync());
  setInterval(() => sync(), 60_000);
}
