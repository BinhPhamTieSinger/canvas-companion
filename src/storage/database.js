export const request = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
export const completed = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = tx.onerror = () => reject(tx.error || new Error('The local update could not be committed.'));
});
// Additive v2 upgrade: original background records and Blob assets are never rewritten.
export function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 2);
    let blocked = false;
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [store, keyPath] of [['backgrounds','scope'], ['assets','id'], ['recovery','scope'], ['academicRecords','key'], ['academicMeta','scope'], ['academicCache','scope']]) {
        if (!db.objectStoreNames.contains(store)) {
          const created = db.createObjectStore(store, { keyPath });
          if (store === 'academicRecords') created.createIndex('scope', 'scope');
        }
      }
    };
    req.onsuccess = () => { if (blocked) req.result.close(); else resolve(req.result); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => { blocked = true; reject(new Error('Close older companion settings tabs, then reload Canvas to finish the safe upgrade.')); };
  });
}
