// Service worker — handles context menu "Clip to TravelPanel"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url   = info.menuItemId === 'clip-link' ? (info.linkUrl ?? info.pageUrl) : info.pageUrl;
  const title = tab?.title ?? '';

  const { appUrl } = await chrome.storage.sync.get('appUrl');

  if (!appUrl) {
    // No app URL configured — open the popup so the user can set it up.
    // Note: chrome.action.openPopup() only works in user-gesture context;
    // create a tab pointing to the app root as a fallback.
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    return;
  }

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
