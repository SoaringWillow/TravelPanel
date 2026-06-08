'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  if (!url || !/^https?:\/\//.test(url)) return;

  const appUrl = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
