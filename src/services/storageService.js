const DB_NAME = 'VaultDB';
const STORE_NAME = 'items';
const META_STORE = 'meta';
const DB_VERSION = 2;

let db = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable. Vault requires browser storage; disable private browsing or use a supported browser.'));
      return;
    }

    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(new Error(`Vault browser storage is unavailable. Safari private browsing may block IndexedDB. ${error.message}`));
      return;
    }

    request.onerror = () =>
      reject(
        new Error(
          `Vault browser storage is unavailable. Safari private browsing may block IndexedDB. ${
            request.error?.message || 'Unable to open the database.'
          }`
        )
      );
    request.onblocked = () => reject(new Error('Vault storage upgrade is blocked by another open tab. Close other Vault tabs and try again.'));
    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => {
        db.close();
        db = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      const tx = event.target.transaction;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      // v1 -> v2: mark existing items dirty so they get pushed on first sync.
      if (event.oldVersion > 0 && event.oldVersion < 2 && database.objectStoreNames.contains(STORE_NAME)) {
        const store = tx.objectStore(STORE_NAME);
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const existing = cursor.value;
          cursor.update({
            ...existing,
            updatedAt: existing.updatedAt || existing.createdAt || new Date().toISOString(),
            dirty: true,
            deleted: Boolean(existing.deleted),
          });
          cursor.continue();
        };
      }
    };
  });
};

const run = async (storeName, mode, fn) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const store = database.transaction([storeName], mode).objectStore(storeName);
    const request = fn(store);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// ---- UI-facing (soft-deleted items hidden) ----
const addItem = async (item) => {
  const now = new Date().toISOString();
  const stored = {
    ...item,
    updatedAt: item.updatedAt || now,
    dirty: true,
    deleted: false,
  };
  await run(STORE_NAME, 'readwrite', (s) => s.add(stored));
  return stored;
};

const updateItem = async (item) => {
  const stored = { ...item, updatedAt: item.updatedAt || new Date().toISOString(), dirty: true };
  await run(STORE_NAME, 'readwrite', (s) => s.put(stored));
  return stored;
};

const deleteItem = async (id) => {
  const item = await run(STORE_NAME, 'readonly', (s) => s.get(id));
  if (!item) return id;
  await run(STORE_NAME, 'readwrite', (s) =>
    s.put({ ...item, deleted: true, dirty: true, updatedAt: new Date().toISOString() })
  );
  return id;
};

const getAllItems = async () => {
  const all = (await run(STORE_NAME, 'readonly', (s) => s.getAll())) || [];
  return all.filter((i) => !i.deleted);
};

const getItemById = async (id) => {
  const item = await run(STORE_NAME, 'readonly', (s) => s.get(id));
  return item && !item.deleted ? item : undefined;
};

// ---- Sync-facing (includes tombstones) ----
const getRaw = (id) => run(STORE_NAME, 'readonly', (s) => s.get(id));
const putRaw = (item) => run(STORE_NAME, 'readwrite', (s) => s.put(item));

const getDirty = async () => {
  const all = (await run(STORE_NAME, 'readonly', (s) => s.getAll())) || [];
  const dirty = all.filter((item) => item.dirty);
  return Promise.all(
    dirty.map(async (item) => {
      const normalized = {
        ...item,
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        deleted: Boolean(item.deleted),
      };
      if (
        normalized.updatedAt !== item.updatedAt ||
        normalized.deleted !== item.deleted
      ) {
        await putRaw(normalized);
      }
      return normalized;
    })
  );
};

// Clears dirty only if the item wasn't edited again during the sync
const markClean = async (entries) => {
  for (const { id, updatedAt } of entries) {
    const cur = await getRaw(id);
    if (cur && cur.updatedAt === updatedAt) await putRaw({ ...cur, dirty: false });
  }
};

const getMeta = async (key) => (await run(META_STORE, 'readonly', (s) => s.get(key)))?.value;
const setMeta = (key, value) => run(META_STORE, 'readwrite', (s) => s.put({ key, value }));

export const storageService = {
  initDB,
  addItem,
  updateItem,
  deleteItem,
  getAllItems,
  getItemById,
  getRaw,
  putRaw,
  getDirty,
  markClean,
  getMeta,
  setMeta,
};