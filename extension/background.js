// Service worker for TravelPanel Clipper (Manifest V3)

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Context menu (right-click → "Clip to TravelPanel") ───────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link', 'selection'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const url   = info.linkUrl || tab.url;
  const title = tab.title || '';

  const stored = await chrome.storage.sync.get('appUrl');
  const appUrl = (stored.appUrl || 'https://travel-panel.vercel.app').replace(/\/$/, '');

  const shareUrl =
    appUrl +
    '/share' +
    '?url=' + encodeURIComponent(url) +
    '&title=' + encodeURIComponent(title);

  chrome.tabs.create({ url: shareUrl });
});
