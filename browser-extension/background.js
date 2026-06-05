// TravelPanel Clipper — background service worker
// Handles context menu for right-click → "Clip page to TravelPanel"

const STORAGE_KEY_URL = 'travelpanel_url';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'travelpanel-clip',
    title: 'Clip page to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'travelpanel-clip') return;

  const { [STORAGE_KEY_URL]: appUrl } = await chrome.storage.sync.get([STORAGE_KEY_URL]);
  if (!appUrl) {
    // Open options page so user can configure
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || '';

  if (!targetUrl) return;

  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', targetUrl);
  if (title) shareUrl.searchParams.set('title', title);

  // Re-use existing TravelPanel tab if open
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => t.url?.startsWith(appUrl));

  if (existing) {
    await chrome.tabs.update(existing.id, { url: shareUrl.toString(), active: true });
    chrome.windows.update(existing.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: shareUrl.toString() });
  }
});
