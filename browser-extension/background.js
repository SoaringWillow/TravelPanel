'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ─── Install hook: create context menu ──────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page', 'selection'],
  });
});

// ─── Context menu handler ────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrl = (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

  let clipUrl = null;
  let clipTitle = '';

  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    clipUrl = info.linkUrl;
  } else if (info.menuItemId === 'clip-page' && tab?.url) {
    clipUrl = tab.url;
    clipTitle = tab.title || '';
  }

  if (!clipUrl) return;
  if (clipUrl.startsWith('chrome://') || clipUrl.startsWith('chrome-extension://')) return;

  const params = new URLSearchParams({ url: clipUrl });
  if (clipTitle) params.set('title', clipTitle);

  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
});

// ─── Keyboard shortcut handler ────────────────────────────────────────────────
// Users can set Alt+Shift+S (or custom) in chrome://extensions/shortcuts
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'clip-current-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrl = (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

  const params = new URLSearchParams({ url: tab.url });
  if (tab.title) params.set('title', tab.title);

  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
});
