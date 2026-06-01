// Service worker — adds a right-click context menu item

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const stored = await chrome.storage.sync.get('appBaseUrl');
  const appBaseUrl = (stored.appBaseUrl || '').replace(/\/$/, '');
  if (!appBaseUrl) {
    // Open options page so user can configure
    chrome.runtime.openOptionsPage();
    return;
  }

  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const shareUrl = `${appBaseUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
