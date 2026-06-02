chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl: stored } = await chrome.storage.sync.get('appUrl');
  const appUrl = (stored || '').trim().replace(/\/$/, '');

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? '' : (tab?.title || '');

  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl, active: true });
});
