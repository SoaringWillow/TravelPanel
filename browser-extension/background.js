'use strict';

// Service worker: context menus, keyboard commands, install flow.

const CTX_CLIP_PAGE = 'clip-page';
const CTX_CLIP_LINK = 'clip-link';

// ─── Context menus ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: CTX_CLIP_PAGE,
    title: 'Clip this page to TravelPanel',
    contexts: ['page', 'frame'],
  });

  chrome.contextMenus.create({
    id: CTX_CLIP_LINK,
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });

  // Show options on first install
  const stored = await chrome.storage.local.get('tpUrl');
  if (!stored.tpUrl) {
    chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const stored = await chrome.storage.local.get('tpUrl');
  const tpUrl = (stored.tpUrl || '').trim().replace(/\/$/, '');
  if (!tpUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url   = info.menuItemId === CTX_CLIP_LINK ? info.linkUrl : (info.pageUrl || tab?.url || '');
  const title = tab?.title || '';

  if (!url) return;

  const params = new URLSearchParams({ url });
  if (title) params.set('title', title);

  chrome.tabs.create({ url: `${tpUrl}/share?${params.toString()}`, active: true });
});

// ─── Keyboard command ──────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const stored = await chrome.storage.local.get('tpUrl');
  const tpUrl = (stored.tpUrl || '').trim().replace(/\/$/, '');
  if (!tpUrl) { chrome.runtime.openOptionsPage(); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  // Attempt to get og:title via content script
  let title = tab.title || '';
  try {
    const meta = await chrome.tabs.sendMessage(tab.id, { type: 'GET_META' });
    if (meta?.title) title = meta.title;
  } catch { /* content script not ready */ }

  const params = new URLSearchParams({ url: tab.url });
  if (title) params.set('title', title);

  chrome.tabs.create({ url: `${tpUrl}/share?${params.toString()}`, active: true });
});
