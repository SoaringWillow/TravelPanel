chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'frame']
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link']
  });
});

async function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelPanelUrl'], (result) => {
      resolve((result.travelPanelUrl || '').replace(/\/$/, ''));
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tpUrl = await getTravelPanelUrl();

  if (!tpUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const urlToClip = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? '' : (tab?.title || '');
  const shareUrl = `${tpUrl}/share?url=${encodeURIComponent(urlToClip)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
