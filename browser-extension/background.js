const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

function buildShareUrl(appUrl, pageUrl, pageTitle) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl });
  if (pageTitle) params.set('title', pageTitle);
  return `${base}/share?${params.toString()}`;
}

// Register context menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel ✈️',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel ✈️',
    contexts: ['link'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();

  if (info.menuItemId === 'clip-page' && tab) {
    const shareUrl = buildShareUrl(appUrl, tab.url, tab.title);
    chrome.tabs.create({ url: shareUrl });
  }

  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    const shareUrl = buildShareUrl(appUrl, info.linkUrl, '');
    chrome.tabs.create({ url: shareUrl });
  }
});
