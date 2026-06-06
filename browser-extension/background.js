'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.local.get('travelPanelUrl');
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const shareUrl = buildShareUrl(travelPanelUrl, url, title);

  chrome.windows.create({ url: shareUrl, type: 'popup', width: 420, height: 640 });
});

function buildShareUrl(base, url, title) {
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
