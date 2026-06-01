'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, data => {
      resolve((data.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

// Open options page on first install
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// Keyboard shortcut: clip current page directly without opening popup
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-current-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('http')) return;

  const appUrl   = await getAppUrl();
  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', tab.url);
  shareUrl.searchParams.set('title', tab.title || tab.url);

  chrome.tabs.create({ url: shareUrl.toString() });
});
