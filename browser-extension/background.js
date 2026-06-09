'use strict';

const DEFAULT_APP_URL = '';

async function getAppUrl() {
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  return appUrl;
}

function buildClipUrl(appUrl, urlToClip) {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/?import=${encodeURIComponent(urlToClip)}`;
}

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel',
    contexts: ['page', 'frame'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  if (!appUrl) {
    // Open options page so user can configure
    chrome.runtime.openOptionsPage();
    return;
  }

  const urlToClip = info.menuItemId === 'clip-link' ? info.linkUrl : tab.url;
  if (!urlToClip) return;

  chrome.tabs.create({ url: buildClipUrl(appUrl, urlToClip) });
});

// Keyboard shortcut: clip current page without popup
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-now') return;

  const appUrl = await getAppUrl();
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.url.startsWith('http')) return;

  chrome.tabs.create({ url: buildClipUrl(appUrl, tab.url) });
});
