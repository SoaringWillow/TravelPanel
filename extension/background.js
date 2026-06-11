'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

async function getAppUrl() {
  const result = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return result.appUrl.replace(/\/$/, '');
}

async function clipUrl(targetUrl) {
  const appUrl = await getAppUrl();
  const importUrl = `${appUrl}/?import=${encodeURIComponent(targetUrl)}`;
  await chrome.tabs.create({ url: importUrl });
}

// ── Install: register context menus ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Clip the current page
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  // Clip a hovered link
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

// ── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.menuItemId === 'clip-link'
    ? info.linkUrl
    : info.pageUrl || tab?.url;

  if (targetUrl) await clipUrl(targetUrl);
});

// ── Keyboard shortcut handler ────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'clip-current-page' && tab?.url) {
    await clipUrl(tab.url);
  }
});
