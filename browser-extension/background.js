// TravelPanel Extension — background service worker

// Handle pending new board: when a new board was created in the popup,
// sync it to the cached boards list so future popup sessions see it.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.pendingNewBoard?.newValue) {
    const newBoard = changes.pendingNewBoard.newValue;
    chrome.storage.local.get(['boards'], ({ boards = [] }) => {
      const already = boards.find(b => b.id === newBoard.id);
      if (!already) {
        chrome.storage.local.set({
          boards: [newBoard, ...boards],
          pendingNewBoard: null,
        });
      }
    });
  }
});
