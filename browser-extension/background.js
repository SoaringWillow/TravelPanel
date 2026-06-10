chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

async function openClip(url, title = '') {
  const { baseUrl = '' } = await chrome.storage.sync.get(['baseUrl']);
  const trimmed = baseUrl.replace(/\/$/, '');

  if (!trimmed) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = `${trimmed}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    openClip(info.linkUrl, '');
  } else if (info.menuItemId === 'clip-page' && tab?.url) {
    openClip(tab.url, tab.title || '');
  }
});
