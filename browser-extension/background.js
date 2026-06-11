'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Create the right-click context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save to TravelPanel ✈️',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  // Use link URL if user right-clicked a link, otherwise current page URL
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  const title = info.linkUrl ? '' : (tab?.title || '');

  chrome.storage.sync.get(['appUrl'], result => {
    const appUrl = (result.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  });
});
