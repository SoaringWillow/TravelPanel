'use strict';

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: 'http://localhost:3000' }, data => {
      resolve(data.appUrl.replace(/\/$/, ''));
    });
  });
}

// Create context menus on install / update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: '✈️ Clip this page to TravelPanel',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'clip-link',
      title: '✈️ Clip this link to TravelPanel',
      contexts: ['link'],
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

  const title = info.linkUrl ? '' : (tab?.title ?? '');
  const appUrl = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});
