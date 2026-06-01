'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

// Register right-click context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

async function getAppUrl() {
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  return appUrl;
}

function buildShareUrl(appUrl, url, title) {
  return (
    `${appUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title || '')}`
  );
}

// Context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const appUrl = await getAppUrl();
  const url    = info.linkUrl || tab?.url || '';
  const title  = tab?.title  || '';

  chrome.tabs.create({ url: buildShareUrl(appUrl, url, title) });
});

// Keyboard shortcut (Ctrl+Shift+S / Cmd+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('http')) return;

  const appUrl = await getAppUrl();
  chrome.tabs.create({ url: buildShareUrl(appUrl, tab.url, tab.title || '') });
});
