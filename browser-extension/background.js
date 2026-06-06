'use strict';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save page to TravelPanel ✈️',
    contexts: ['page', 'link'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrl = (stored.appUrl || '').trim().replace(/\/$/, '');

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  // Prefer the link URL if right-clicked on a link, else the page URL
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title     = tab?.title || '';

  if (!targetUrl) return;

  const shareUrl = appUrl +
    '/share?url=' + encodeURIComponent(targetUrl) +
    (title ? '&title=' + encodeURIComponent(title) : '');

  chrome.tabs.create({ url: shareUrl });
});
