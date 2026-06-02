'use strict';

// ── Context menu setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

// ── Context menu click handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.id === 'clip-link' ? info.linkUrl : (info.pageUrl || tab?.url);
  if (!url) return;

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const title = tab?.title || '';
  const shareUrl = `${appUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});

// ── Keyboard shortcut (Alt+Shift+S) ─────────────────────────────────────────
// Declared in manifest commands; handler wired here.

chrome.commands?.onCommand.addListener(async command => {
  if (command !== 'clip-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = `${appUrl}/share` +
    `?url=${encodeURIComponent(tab.url)}` +
    `&title=${encodeURIComponent(tab.title || '')}`;

  chrome.tabs.create({ url: shareUrl });
});
