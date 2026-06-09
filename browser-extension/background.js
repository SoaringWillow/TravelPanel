// TravelPanel Clipper — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  const title = info.menuItemId === 'clip-link' ? '' : (tab?.title || '');
  openSharePage(url, title);
});

function openSharePage(url, title) {
  chrome.storage.sync.get({ appUrl: 'https://travelpanel.app' }, (settings) => {
    const base = settings.appUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  });
}
