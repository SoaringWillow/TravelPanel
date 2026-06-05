// Service worker for TravelPanel Clipper extension

chrome.runtime.onInstalled.addListener(() => {
  // Context menu: right-click on page
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  // Context menu: right-click on a link
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.sync.get(['travelPanelUrl']);
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = encodeURIComponent(tab?.title || '');
  const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(url)}&title=${title}`;

  chrome.tabs.create({ url: shareUrl });
});
