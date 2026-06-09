chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel 📌',
    contexts: ['page', 'link'],
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: '' });
  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

  const shareUrl = buildShareUrl(travelpanelUrl, tab.url, tab.title || tab.url);
  chrome.tabs.create({ url: shareUrl });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: '' });
  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? info.linkUrl : (tab?.title || url);
  const shareUrl = buildShareUrl(travelpanelUrl, url, title);
  chrome.tabs.create({ url: shareUrl });
});

function buildShareUrl(base, url, title) {
  return `${base.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
