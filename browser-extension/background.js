'use strict';

const DEFAULT_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url =
    info.menuItemId === 'clip-link' ? info.linkUrl : info.pageUrl;
  const title = info.menuItemId === 'clip-link' ? '' : (tab?.title || '');

  const { travelPanelUrl } = await chrome.storage.sync.get({
    travelPanelUrl: DEFAULT_URL,
  });
  const base = travelPanelUrl.replace(/\/$/, '');
  const shareUrl =
    `${base}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});
