'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

// Install context menu on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const appUrl = await getAppUrl();
  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Reuse existing TravelPanel tab or open new one
  const appOrigin = new URL(appUrl).origin;
  const existing = await chrome.tabs.query({ url: `${appOrigin}/*` });

  if (existing.length > 0) {
    chrome.tabs.update(existing[0].id, { url: shareUrl, active: true });
    chrome.windows.update(existing[0].windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: shareUrl });
  }
});
