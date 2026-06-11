// Service worker: sets up the right-click context menu on install

const DEFAULT_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.menuItemId === 'save-link' ? info.linkUrl : (info.pageUrl || tab?.url || '');
  const title = tab?.title || '';

  chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL }, ({ travelpanelUrl }) => {
    const shareUrl =
      `${travelpanelUrl.replace(/\/$/, '')}/share` +
      `?url=${encodeURIComponent(url)}` +
      `&title=${encodeURIComponent(title)}`;

    chrome.tabs.create({ url: shareUrl });
  });
});
