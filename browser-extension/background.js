chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'save-page-to-travelpanel',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || '';

  if (!url) return;

  const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', url);
  if (title && info.pageUrl) shareUrl.searchParams.set('title', title);

  chrome.tabs.create({ url: shareUrl.toString() });
});
