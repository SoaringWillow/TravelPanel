'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, result => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

// Keyboard shortcut: Cmd+Shift+S / Ctrl+Shift+S → save current tab directly
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-travelpanel') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const appUrl = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
  await chrome.tabs.create({ url: shareUrl, active: true });
});

// Context menu: right-click → "Save to TravelPanel" on any page
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  let targetUrl = tab?.url || '';
  let targetTitle = tab?.title || '';

  if (info.menuItemId === 'save-link' && info.linkUrl) {
    targetUrl = info.linkUrl;
    targetTitle = info.linkText || info.linkUrl;
  }

  if (!targetUrl || targetUrl.startsWith('chrome://')) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}`;
  await chrome.tabs.create({ url: shareUrl, active: true });
});
