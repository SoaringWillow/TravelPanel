'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Register context menu items on install / update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });
});

// Open the TravelPanel share page with the given URL
async function openSharePage(url, title) {
  const storage = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  const appUrl = (storage.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;
  chrome.tabs.create({ url: shareUrl });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-link' && info.linkUrl) {
    openSharePage(info.linkUrl, info.selectionText || '');
  } else if (info.menuItemId === 'save-page' && tab?.url) {
    openSharePage(tab.url, tab.title || '');
  }
});

// Allow other extensions / popups to request share via message
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_URL' && message.url) {
    openSharePage(message.url, message.title || '').then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }
});
