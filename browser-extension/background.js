// Background service worker — handles context menu + keyboard shortcut
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;
  const url = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || '';
  openSharePage(url, title);
});

function openSharePage(url, title) {
  chrome.storage.sync.get({ appUrl: 'https://travelpanel.vercel.app' }, ({ appUrl }) => {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  });
}
