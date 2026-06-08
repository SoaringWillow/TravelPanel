// Background service worker — context menu + badge

const DEFAULT_URL = 'http://localhost:3000';

// ── Context menus ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Save to TravelPanel',
      contexts: ['page', 'selection'],
    });
    chrome.contextMenus.create({
      id: 'clip-link',
      title: 'Save link to TravelPanel',
      contexts: ['link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl: stored } = await chrome.storage.sync.get(['appUrl']);
  const appUrl = (stored || DEFAULT_URL).replace(/\/$/, '');

  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.selectionText || tab?.title || '';

  const params = new URLSearchParams({ url, title, source: 'extension' });
  const shareUrl = `${appUrl}/share?${params}`;

  const w = 480, h = 580;
  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: w,
    height: h,
    left: 0,
    top: 0,
  });
});

// ── Message from popup / options ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_APP_URL') {
    chrome.storage.sync.get(['appUrl']).then(({ appUrl }) => {
      sendResponse({ appUrl: appUrl || DEFAULT_URL });
    });
    return true; // async
  }
});
