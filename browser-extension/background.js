'use strict';

// ── Context menus ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelpanelUrl } = await chrome.storage.sync.get('travelpanelUrl');

  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl   = info.menuItemId === 'save-link' ? info.linkUrl : tab?.url ?? '';
  const targetTitle = info.menuItemId === 'save-link' ? info.linkUrl : tab?.title ?? '';

  if (!targetUrl) return;

  const base   = travelpanelUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: targetUrl, title: targetTitle });
  chrome.tabs.create({ url: `${base}/share?${params.toString()}` });
});
