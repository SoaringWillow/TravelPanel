// ── Default app URL ────────────────────────────────────────────────────────
const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  const stored = await chrome.storage.local.get(['appUrl']);
  return stored.appUrl || DEFAULT_APP_URL;
}

// ── Context menus ──────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // Right-click on a page → save page
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page', 'frame'],
  });

  // Right-click on a link → save link
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  let url = '';
  let title = '';

  if (info.menuItemId === 'save-link') {
    url   = info.linkUrl || '';
    title = info.selectionText || url;
  } else {
    url   = info.pageUrl || tab?.url || '';
    title = tab?.title || url;
  }

  if (!url) return;

  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', url);
  shareUrl.searchParams.set('title', title);

  chrome.tabs.create({ url: shareUrl.toString() });
});

// ── Keyboard shortcut (Alt+Shift+S) ───────────────────────────────────────
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'save-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const appUrl = await getAppUrl();
  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', tab.url);
  shareUrl.searchParams.set('title', tab.title || tab.url);

  chrome.tabs.create({ url: shareUrl.toString() });
});
