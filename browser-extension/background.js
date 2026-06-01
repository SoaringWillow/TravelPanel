'use strict';

// ── Context menu ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: '📍 Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { travelpanelUrl } = await chrome.storage.sync.get('travelpanelUrl');
  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  // For link right-clicks use the link URL; for page right-clicks use the page URL
  const targetUrl = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const title = tab?.title ?? targetUrl;
  const base = travelpanelUrl.replace(/\/$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});
