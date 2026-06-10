// TravelPanel Clipper — background service worker

chrome.runtime.onInstalled.addListener(async () => {
  // Right-click context menu
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-image',
    title: 'Clip image source to TravelPanel',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: '' });
  const baseUrl = (travelPanelUrl || '').replace(/\/$/, '');

  let url = '';
  let title = tab?.title || '';

  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    url = info.linkUrl;
    title = info.linkText || title;
  } else if (info.menuItemId === 'clip-page' && tab?.url) {
    url = tab.url;
  } else if (info.menuItemId === 'clip-image' && info.srcUrl) {
    url = info.srcUrl;
    title = 'Image from ' + (tab?.title || new URL(info.srcUrl).hostname);
  }

  if (!url) return;

  if (!baseUrl) {
    // Open options so the user can configure the URL
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = new URL('/share', baseUrl);
  shareUrl.searchParams.set('url', url);
  if (title) shareUrl.searchParams.set('title', title);

  chrome.tabs.create({ url: shareUrl.toString() });
});
