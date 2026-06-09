'use strict';

// ── Context menu ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');
  const tpUrl = normalizeTpUrl(travelpanelUrl);

  if (!tpUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  // For a link right-click, clip the link URL; otherwise clip the current page
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  const title     = info.linkUrl ? '' : (tab?.title || '');

  if (!targetUrl) return;

  const shareUrl = tpUrl + '/share'
    + '?url='   + encodeURIComponent(targetUrl)
    + '&title=' + encodeURIComponent(title);

  chrome.tabs.create({ url: shareUrl });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTpUrl(raw) {
  let u = (raw || '').trim().replace(/\/+$/, '');
  if (u && !u.startsWith('http')) u = 'https://' + u;
  return u;
}
