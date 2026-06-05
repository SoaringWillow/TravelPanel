// Background service worker
// Registers context menu and handles first-install setup

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }

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
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: '' });
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  let url, title;

  if (info.menuItemId === 'clip-link') {
    url = info.linkUrl;
    title = info.linkText || url;
  } else {
    url = tab?.url;
    title = tab?.title || url;
  }

  if (!url) return;

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', url);
  shareUrl.searchParams.set('title', title ?? '');
  shareUrl.searchParams.set('source', 'browser-extension');

  chrome.tabs.create({ url: shareUrl.toString() });
});
