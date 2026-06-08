// Runs on TravelPanel pages. Reads boards from IndexedDB and caches them
// in chrome.storage.local so the extension popup can display them.
(function syncBoards() {
  if (!window.indexedDB) return;

  const DB_NAME    = 'travel-panel';
  const STORE_NAME = 'boards';

  const req = indexedDB.open(DB_NAME);
  req.onsuccess = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) return;

    const tx   = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all   = store.getAll();

    all.onsuccess = () => {
      const boards = (all.result || []).map(b => ({ id: b.id, name: b.name }));
      chrome.storage.local.set({ boards });
    };
  };
})();
