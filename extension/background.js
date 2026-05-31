'use strict';

// Minimal MV3 service worker.
// Handles the context-menu shortcut (right-click → Clip with TravelPanel).

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link with TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page with TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  if (!targetUrl) return;

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = appUrl || 'http://localhost:3000';
  const encoded = encodeURIComponent(targetUrl);
  const title = encodeURIComponent(tab?.title || '');

  chrome.tabs.create({ url: `${base}/share?url=${encoded}&title=${title}` });
});
