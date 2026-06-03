chrome.runtime.onInstalled.addListener(() => {
  console.log('TravelPanel Clipper installed');
});

chrome.action.onClicked.addListener((tab) => {
  // Fallback if popup doesn't open (e.g. on chrome:// pages)
  if (tab.url && tab.url.startsWith('http')) {
    chrome.storage.sync.get(['serverUrl'], (result) => {
      const server = result.serverUrl || 'http://localhost:3000';
      chrome.tabs.create({
        url: `${server}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`,
      });
    });
  }
});
