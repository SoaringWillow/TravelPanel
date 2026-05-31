/* TravelPanel Clipper — background service worker */

// Open settings page on first install so user can configure the app URL
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }
});
