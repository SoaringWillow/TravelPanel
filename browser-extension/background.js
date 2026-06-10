// Service worker: registers context menu and handles context menu clicks

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.linkUrl || tab?.url || '';
  const targetTitle = tab?.title || '';
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}`;
  chrome.tabs.create({ url: shareUrl });
});
