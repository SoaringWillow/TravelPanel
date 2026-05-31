'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

async function openShare(url, title) {
  const appUrl   = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
}

// Context menus — installed once on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel ✈',
    contexts: ['link'],
  });
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save this page to TravelPanel ✈',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url   = info.linkUrl || info.pageUrl || '';
  const title = info.linkUrl ? '' : (tab?.title || '');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    openShare(url, title);
  }
});

// Keyboard shortcut (Alt+Shift+T / Cmd+Shift+T)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    openShare(url, title);
  }
});
