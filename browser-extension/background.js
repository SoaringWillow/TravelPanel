// Service worker — minimal; popup handles all logic.
// Keeps the extension alive for future context-menu support.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
