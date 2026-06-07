'use strict';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // First install: open options so the user can set their TravelPanel URL
  if (reason === 'install') {
    const data = await chrome.storage.sync.get('travelPanelUrl');
    if (!data.travelPanelUrl) {
      chrome.runtime.openOptionsPage();
    }
  }

  // Register right-click context menu
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const data = await chrome.storage.sync.get('travelPanelUrl');
  const tpUrl = (data.travelPanelUrl || '').trim();

  if (!tpUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl  = info.linkUrl || info.pageUrl || tab?.url || '';
  const targetTitle = tab?.title || '';
  const shareUrl   = `${tpUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}`;

  chrome.tabs.create({ url: shareUrl });
});
