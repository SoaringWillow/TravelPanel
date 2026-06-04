// Service worker for TravelPanel Clipper extension.
// Handles install/update lifecycle events.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open options page on first install so user can set the app URL.
    chrome.runtime.openOptionsPage();
  }
});
