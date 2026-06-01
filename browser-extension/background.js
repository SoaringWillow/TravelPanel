chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['travelPanelUrl'], (result) => {
    if (!result.travelPanelUrl) {
      chrome.storage.sync.set({ travelPanelUrl: 'http://localhost:3000' });
    }
  });

  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  chrome.storage.sync.get(['travelPanelUrl'], (result) => {
    const base = result.travelPanelUrl || 'http://localhost:3000';
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  });
});
