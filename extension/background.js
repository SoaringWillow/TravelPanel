'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  return (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
}

async function openImport(url) {
  const appUrl = await getAppUrl();
  const importUrl = `${appUrl}?import=${encodeURIComponent(url)}`;

  const allTabs = await chrome.tabs.query({});
  const existing = allTabs.find(t => t.url?.startsWith(appUrl) || t.pendingUrl?.startsWith(appUrl));

  if (existing) {
    await chrome.tabs.update(existing.id, { url: importUrl, active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: importUrl });
  }
}

// ── Install / update ─────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // Register context menu
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
});

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === 'clip-link' ? info.linkUrl : tab?.url;
  if (url) openImport(url).catch(console.error);
});
