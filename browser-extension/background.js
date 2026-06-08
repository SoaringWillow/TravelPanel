'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('appUrl', (data) => {
      resolve((data.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

function openSharePage(url, title) {
  getAppUrl().then((appUrl) => {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;
    chrome.tabs.create({ url: shareUrl });
  });
}

// Set up context menus on install / update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Clip this page to TravelPanel',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'clip-link',
      title: 'Clip this link to TravelPanel',
      contexts: ['link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    openSharePage(info.linkUrl, info.selectionText || info.linkUrl);
  } else if (info.menuItemId === 'clip-page') {
    openSharePage(tab?.url || info.pageUrl || '', tab?.title || '');
  }
});

// Keyboard shortcut support (if declared in manifest)
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'clip-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) openSharePage(tab.url || '', tab.title || '');
    });
  }
});
