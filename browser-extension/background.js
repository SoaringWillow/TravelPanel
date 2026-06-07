'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── Context menu ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const stored = await chrome.storage.local.get('appUrl');
  const appUrl = (stored.appUrl || '').replace(/\/$/, '') || DEFAULT_APP_URL;

  const targetUrl = info.linkUrl || tab?.url || '';
  const title     = tab?.title || targetUrl;

  if (!targetUrl) return;

  const params = new URLSearchParams({
    url:    targetUrl,
    title:  title,
    source: 'extension',
  });

  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
});

// ── Keyboard shortcut ──────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-current-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const stored = await chrome.storage.local.get('appUrl');
  const appUrl = (stored.appUrl || '').replace(/\/$/, '') || DEFAULT_APP_URL;

  const params = new URLSearchParams({
    url:    tab.url,
    title:  tab.title || tab.url,
    source: 'extension',
  });

  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
});
