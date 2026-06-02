'use strict';

const DEFAULT_APP_URL = '';

function getAppUrl() {
  return new Promise(resolve =>
    chrome.storage.sync.get(['appUrl'], r => resolve((r.appUrl || '').trim()))
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const appUrl = await getAppUrl();
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url   = info.linkUrl || tab?.url || '';
  const title = tab?.title   || 'Saved link';
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
