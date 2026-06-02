const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

function buildShareUrl(appUrl, url, title) {
  return `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;
}

// Register context menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  const url = info.id === 'clip-link' ? info.linkUrl : info.pageUrl;
  const title = tab?.title || '';
  chrome.tabs.create({ url: buildShareUrl(appUrl, url, title) });
});

// Handle keyboard shortcut (Alt+Shift+S)
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'clip-current-page') return;
  const appUrl = await getAppUrl();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  chrome.tabs.create({ url: buildShareUrl(appUrl, tab.url, tab.title || '') });
});
