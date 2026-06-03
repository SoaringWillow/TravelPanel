// Service worker — registers context menu on install/startup

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       'save-to-travelpanel',
    title:    'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const { travelpanelUrl } = await chrome.storage.sync.get('travelpanelUrl');
  const base = (travelpanelUrl || '').replace(/\/$/, '');

  if (!base) {
    chrome.runtime.openOptionsPage();
    return;
  }

  // Prefer the link URL (right-click on link) over page URL
  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || url;

  if (!url) return;

  const shareUrl =
    base +
    '/share?url=' + encodeURIComponent(url) +
    '&title=' + encodeURIComponent(title);

  const width  = 400;
  const height = 600;
  const left   = Math.round((screen.width  - width)  / 2);
  const top    = Math.round((screen.height - height) / 2);

  chrome.windows.create({ url: shareUrl, type: 'popup', width, height, left, top });
});
