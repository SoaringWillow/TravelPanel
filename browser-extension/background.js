const DEFAULT_URL = 'https://travelpanel.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const isLink = info.menuItemId === 'clip-link';
  const targetUrl = isLink ? info.linkUrl : info.pageUrl;
  const targetTitle = isLink ? (info.selectionText || info.linkUrl) : (tab?.title || info.pageUrl);

  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl');

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', targetUrl);
  shareUrl.searchParams.set('title', targetTitle);
  shareUrl.searchParams.set('source', 'browser-extension');

  chrome.tabs.create({ url: shareUrl.toString() });
});

// Handle keyboard shortcut (Alt+Shift+S) defined in manifest
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl');

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', tab.url);
  if (tab.title) shareUrl.searchParams.set('title', tab.title);
  shareUrl.searchParams.set('source', 'browser-extension-shortcut');

  chrome.tabs.create({ url: shareUrl.toString() });
});
