'use strict';

// Service worker required by MV3. Listens for the extension install event
// to set default storage values, and handles the context-menu clip action.

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  }

  // Register a right-click context menu item so users can clip any link
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'clip-page-to-travelpanel',
    title: 'Save this page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  const base = appUrl.replace(/\/$/, '');

  if (info.menuItemId === 'clip-to-travelpanel' && info.linkUrl) {
    const shareUrl = `${base}/share?url=${encodeURIComponent(info.linkUrl)}`;
    chrome.tabs.create({ url: shareUrl });
  }

  if (info.menuItemId === 'clip-page-to-travelpanel' && tab?.url) {
    const shareUrl = `${base}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
    chrome.tabs.create({ url: shareUrl });
  }
});
