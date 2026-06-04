const DEFAULT_TRAVELPANEL_URL = 'https://travel-panel.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const { travelPanelUrl = DEFAULT_TRAVELPANEL_URL } = await chrome.storage.sync.get('travelPanelUrl');

  // Prefer the clicked link URL over the page URL
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', targetUrl);
  if (title) shareUrl.searchParams.set('title', title);

  chrome.tabs.create({ url: shareUrl.toString() });
});
