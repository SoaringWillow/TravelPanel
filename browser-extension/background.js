'use strict';

// ─── Context menu: right-click any link → Clip link to TravelPanel ───────────

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
  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');
  const baseUrl = (travelPanelUrl || '').replace(/\/$/, '');

  if (!baseUrl) {
    // Open options page so the user can configure the URL
    chrome.runtime.openOptionsPage();
    return;
  }

  let targetUrl   = '';
  let targetTitle = '';

  if (info.menuItemId === 'clip-link') {
    targetUrl   = info.linkUrl ?? '';
    targetTitle = info.selectionText ?? '';
  } else if (info.menuItemId === 'clip-page') {
    targetUrl   = tab?.url ?? '';
    targetTitle = tab?.title ?? '';
  }

  if (!targetUrl) return;

  const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}`;
  chrome.tabs.create({ url: shareUrl });
});
