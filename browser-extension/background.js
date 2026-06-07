// Service worker — handles extension lifecycle events

// Context menu: right-click any page link to clip it
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const base  = travelPanelUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url, title });

  chrome.tabs.create({ url: `${base}/share?${params}` });
});

// Add "contextMenus" permission to manifest if not present — just handles gracefully if missing
