// Service worker — registers the right-click context menu

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel ✈️',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel ✈️',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;

  const { travelPanelUrl } = await chrome.storage.sync.get(['travelPanelUrl']);
  const base = (travelPanelUrl || '').replace(/\/$/, '');
  if (!base) {
    // No URL configured — open options page
    chrome.runtime.openOptionsPage();
    return;
  }

  chrome.tabs.create({
    url: `${base}/?import=${encodeURIComponent(url)}`,
  });
});
