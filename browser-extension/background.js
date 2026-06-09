const DEFAULT_TP_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  // Right-click → "Clip this page to TravelPanel"
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  // Right-click on a link → "Clip this link to TravelPanel"
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl = DEFAULT_TP_URL } = await chrome.storage.sync.get('travelPanelUrl');
  const base = travelPanelUrl.replace(/\/$/, '');

  const url =
    info.menuItemId === 'clip-link'
      ? info.linkUrl
      : info.pageUrl || tab?.url;

  if (url) {
    chrome.tabs.create({ url: `${base}/?import=${encodeURIComponent(url)}` });
  }
});
