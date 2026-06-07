'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!['clip-page', 'clip-link'].includes(info.menuItemId)) return;

  const stored = await chrome.storage.local.get(['appUrl']);
  const appUrl = stored.appUrl || DEFAULT_APP_URL;

  const targetUrl = info.menuItemId === 'clip-link'
    ? (info.linkUrl || info.pageUrl)
    : (info.pageUrl || tab?.url);

  if (!targetUrl) return;

  const shareUrl = new URL(`${appUrl}/share`);
  shareUrl.searchParams.set('url', targetUrl);
  if (tab?.title) shareUrl.searchParams.set('title', tab.title);

  chrome.tabs.create({ url: shareUrl.toString() });
});
