// Open popup on extension icon click (default action behavior — explicit handler for MV3)
chrome.action.onClicked.addListener(() => {
  // Popup handles everything; this is a no-op but keeps the service worker registered
});
