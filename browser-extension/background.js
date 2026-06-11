'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
      resolve(data.appUrl || DEFAULT_APP_URL);
    });
  });
}

// Install: create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  if (!url) return;

  const appUrl   = await getAppUrl();
  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});
