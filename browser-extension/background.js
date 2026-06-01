// Service worker — registers context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { appUrl = '' } = await chrome.storage.sync.get('appUrl');
  if (!appUrl) {
    chrome.runtime.openOptionsPage?.();
    return;
  }

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const shareUrl = buildShareUrl(appUrl, targetUrl, title);
  chrome.tabs.create({ url: shareUrl });
});

function buildShareUrl(appUrl, url, title) {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
