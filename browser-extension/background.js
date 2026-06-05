'use strict';

// ── Context menu (right-click → Clip to TravelPanel) ───────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel ✈️',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel ✈️',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { panelUrl } = await chrome.storage.sync.get(['panelUrl']);

  if (!panelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const clipUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const clipTitle = info.linkUrl ? '' : (tab?.title || '');

  const shareUrl =
    panelUrl.replace(/\/$/, '') +
    '/share?url=' + encodeURIComponent(clipUrl) +
    (clipTitle ? '&title=' + encodeURIComponent(clipTitle) : '');

  chrome.tabs.create({ url: shareUrl });
});
