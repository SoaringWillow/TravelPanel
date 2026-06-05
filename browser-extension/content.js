// Runs on TravelPanel pages — syncs board data to chrome.storage.local
// so the extension popup can show the user's boards without extra API calls.

(function syncBoardsToExtension() {
  const DB_NAME = 'travel-panel';
  const STORE = 'boards';

  function readBoardsFromIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) { resolve([]); return; }
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result || []);
        all.onerror = () => resolve([]);
      };
    });
  }

  async function sync() {
    try {
      const boards = await readBoardsFromIDB();
      // Store lightweight board list (id, name, emoji, itemIds.length)
      const slim = boards
        .filter((b) => !b.isDemo)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((b) => ({
          id: b.id,
          name: b.name,
          emoji: b.emoji,
          itemIds: b.itemIds || [],
        }));
      chrome.runtime.sendMessage({ type: 'SYNC_BOARDS', boards: slim }).catch(() => {});
    } catch {
      // Silently fail — IDB may not be initialized yet
    }
  }

  // Sync on page load and after navigation events
  sync();
  window.addEventListener('focus', sync);
})();
