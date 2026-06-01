// MV3 service worker — no persistent state needed; popup handles everything.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('appUrl', ({ appUrl }) => {
    if (!appUrl) chrome.action.setBadgeText({ text: '!' });
  });
});
