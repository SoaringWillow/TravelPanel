/* global chrome */

// Service worker for TravelPanel Clipper (Manifest V3)
// Currently minimal — just keeps the extension alive and handles context menu.

chrome.runtime.onInstalled.addListener(() => {
  // Register a right-click context menu entry for quick clipping
  chrome.contextMenus?.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = appUrl || 'https://travelpanel.vercel.app';

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || '';

  if (!targetUrl) return;

  const params = new URLSearchParams({ url: targetUrl });
  if (title) params.set('title', title);

  chrome.tabs.create({ url: `${base}/share?${params.toString()}` });
});
