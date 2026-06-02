'use strict';

// ── Service Worker ────────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

// Create context menus on first install / update
chrome.runtime.onInstalled.addListener(() => {
  // Right-click on any page → save current page
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  // Right-click on a link → save that link
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-page' && info.menuItemId !== 'save-link') return;

  const url   = (info.menuItemId === 'save-link' ? info.linkUrl : null) || info.pageUrl || tab?.url || '';
  const title = info.menuItemId === 'save-page' ? (tab?.title || '') : '';

  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  const appUrl = (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
