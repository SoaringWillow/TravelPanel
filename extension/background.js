'use strict';

// ── Context menu ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!['clip-page', 'clip-link'].includes(String(info.menuItemId))) return;

  const { travelPanelUrl = '' } = await chrome.storage.sync.get({ travelPanelUrl: '' });

  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.menuItemId === 'clip-link'
    ? (info.linkUrl || info.pageUrl)
    : info.pageUrl;

  const title = tab?.title || '';

  const shareUrl =
    `${travelPanelUrl}/share` +
    `?url=${encodeURIComponent(targetUrl)}` +
    `&title=${encodeURIComponent(title)}` +
    `&source=extension`;

  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: 440,
    height: 720,
  });
});

// ── Extension icon click shortcut ─────────────────────────────────────────────
// If the popup can't open (e.g. restricted page), open options instead.

chrome.action.onClicked.addListener(() => {
  // This only fires when there is NO popup configured.
  // Since we have a popup, this is a safety net — no-op.
});
