/* TravelPanel Clipper — Service Worker */

const DEFAULT_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-page' && info.menuItemId !== 'clip-link') return;

  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
  const base = travelpanelUrl.replace(/\/$/, '');

  const clipUrl = info.menuItemId === 'clip-link' ? info.linkUrl : tab.url;
  const clipTitle = info.menuItemId === 'clip-link' ? info.linkText || '' : tab.title || '';

  const params = new URLSearchParams({ url: clipUrl, title: clipTitle });

  chrome.windows.create({
    url: `${base}/share?${params.toString()}`,
    type: 'popup',
    width: 420,
    height: 620,
    focused: true,
  });
});
