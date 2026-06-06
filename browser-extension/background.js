'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-link',
    title: '📌 Clip link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'clip-page',
    title: '📌 Clip this page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: '' });

  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const base = travelPanelUrl.replace(/\/+$/, '');

  if (info.menuItemId === 'clip-link') {
    const url = info.linkUrl || '';
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}`;
    chrome.tabs.create({ url: shareUrl });
  } else if (info.menuItemId === 'clip-page') {
    const url = info.pageUrl || (tab && tab.url) || '';
    const title = (tab && tab.title) || '';
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  }
});
