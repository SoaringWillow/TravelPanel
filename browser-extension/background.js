'use strict';

// ── Context menu ───────────────────────────────────────────────────────────

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-travelpanel',
      title: 'Save to TravelPanel ✈️',
      contexts: ['page', 'link'],
    });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

// ── Context menu click ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const { appUrl } = await chrome.storage.sync.get('appUrl');

  if (!appUrl) {
    // Open popup (options page) so user can configure the URL first
    chrome.runtime.openOptionsPage();
    return;
  }

  // Use the link URL if right-clicking a link, otherwise the page URL
  const targetUrl   = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const targetTitle = info.selectionText ? info.selectionText.slice(0, 200) : (tab?.title ?? '');

  if (!targetUrl) return;

  const base   = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: targetUrl, title: targetTitle });
  const shareUrl = `${base}/share?${params.toString()}`;

  chrome.tabs.create({ url: shareUrl });
});

// ── Message listener ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'APP_URL_UPDATED') {
    createContextMenu();
  }
});
