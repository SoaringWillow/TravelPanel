// background.js — TravelPanel Clipper service worker (Manifest V3)

const STORAGE_KEY = 'travelpanel_url';
const MENU_ID     = 'clip-to-travelpanel';
const MENU_LINK   = 'clip-link-to-travelpanel';

// ── Setup on install ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Right-click any page
  chrome.contextMenus.create({
    id:       MENU_ID,
    title:    'Clip page to TravelPanel ✈️',
    contexts: ['page'],
  });

  // Right-click a link
  chrome.contextMenus.create({
    id:       MENU_LINK,
    title:    'Clip link to TravelPanel ✈️',
    contexts: ['link'],
  });
});

// ── Context menu handler ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID && info.menuItemId !== MENU_LINK) return;

  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const appUrl = (stored[STORAGE_KEY] || '').replace(/\/$/, '');

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.menuItemId === MENU_LINK
    ? (info.linkUrl || info.pageUrl || tab?.url)
    : (info.pageUrl || tab?.url);

  if (!targetUrl) return;

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(targetUrl)}` +
    `&title=${encodeURIComponent(tab?.title || '')}`;

  chrome.tabs.create({ url: shareUrl });
});

// ── Keyboard shortcut handler ─────────────────────────────────────────────────

chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const appUrl = (stored[STORAGE_KEY] || '').replace(/\/$/, '');
  if (!appUrl) { chrome.runtime.openOptionsPage(); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(tab.url)}` +
    `&title=${encodeURIComponent(tab.title || '')}`;

  chrome.tabs.create({ url: shareUrl });
});
