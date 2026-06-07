// Context menu: right-click any page or link to open TravelPanel share flow
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || tab?.url;
  if (!targetUrl) return;

  const { tpServerUrl } = await chrome.storage.local.get('tpServerUrl');
  if (!tpServerUrl) {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    return;
  }

  const shareUrl = `${tpServerUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(targetUrl)}`;
  chrome.tabs.create({ url: shareUrl });
});
