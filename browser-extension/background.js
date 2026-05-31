'use strict';

// Context menu: right-click any link → Clip link to TravelPanel
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus?.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
});

async function getAppUrl() {
  const stored = await chrome.storage.sync.get('appUrl');
  return stored.appUrl || 'https://your-app.vercel.app';
}

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  let targetUrl, title;

  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    targetUrl = info.linkUrl;
    title = info.linkUrl;
  } else if (info.menuItemId === 'clip-page') {
    targetUrl = tab?.url;
    title = tab?.title || tab?.url;
  }

  if (!targetUrl) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title || '')}`;
  chrome.tabs.create({ url: shareUrl });
});
