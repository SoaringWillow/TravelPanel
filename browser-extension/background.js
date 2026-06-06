// ─── Service worker for TravelPanel Clipper ──────────────────────────────────

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

// ─── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();

  let targetUrl;
  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    targetUrl = info.linkUrl;
  } else if (info.menuItemId === 'clip-page' && tab?.url) {
    targetUrl = tab.url;
  }

  if (!targetUrl) return;

  const encodedUrl = encodeURIComponent(targetUrl);
  chrome.tabs.create({ url: `${appUrl}?import=${encodedUrl}` });
});

// ─── Handle extension icon click (fallback if popup is not set) ───────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  const appUrl = await getAppUrl();
  const encodedUrl = encodeURIComponent(tab.url);
  chrome.tabs.create({ url: `${appUrl}?import=${encodedUrl}` });
});
