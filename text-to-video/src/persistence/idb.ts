/** Minimal promise wrapper around IndexedDB — just what autosave needs, no dependency. */

const DB_NAME = 'articvid';
const DB_VERSION = 1;
export type StoreName = 'session' | 'media';

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session');
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error ?? new Error('IndexedDB is unavailable'));
    };
  });
  return opening;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = action(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? request.error);
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: StoreName, key: string, value: unknown) => run(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined),
  delete: (store: StoreName, key: string) => run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined),
  keys: (store: StoreName) => run(store, 'readonly', (s) => s.getAllKeys()).then((keys) => keys.map(String)),
  clear: (store: StoreName) => run(store, 'readwrite', (s) => s.clear()).then(() => undefined),
};
