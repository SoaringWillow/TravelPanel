'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

// ─── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel ✈',
    contexts: ['page', 'link'],
  });

  // Set default app URL if not already set
  chrome.storage.sync.get(['appUrl'], (result) => {
    if (!result.appUrl) {
      chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get(['appUrl']);
  const base = appUrl.replace(/\/$/, '');

  const url = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const title = tab?.title ?? '';

  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl, active: true });

  // Update badge count
  const { clipCount = 0 } = await chrome.storage.local.get(['clipCount']);
  const newCount = clipCount + 1;
  await chrome.storage.local.set({ clipCount: newCount });
});

// ─── Message handler (future use: direct API calls from content scripts) ───────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_APP_URL') {
    chrome.storage.sync.get(['appUrl'], (result) => {
      sendResponse({ appUrl: result.appUrl ?? DEFAULT_APP_URL });
    });
    return true; // async response
  }
});
