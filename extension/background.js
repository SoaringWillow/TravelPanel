// Service worker — keeps the extension lightweight.
// Context menu integration for right-click clipping.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  const stored = await chrome.storage.local.get(['travelpanelUrl']);
  const baseUrl = stored.travelpanelUrl || '';

  if (!baseUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = `${baseUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
