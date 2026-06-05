// ─── Context Menu Setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });

  chrome.contextMenus.create({
    id: 'open-travelpanel',
    title: 'Open TravelPanel',
    contexts: ['action'],
  });
});

// ─── Context Menu Click ───────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  if (!targetUrl) return;

  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: 'http://localhost:3000' });
  const base = travelpanelUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: targetUrl, title });
  const shareUrl = `${base}/share?${params}`;

  chrome.tabs.create({ url: shareUrl, active: true });
});

// ─── Board Sync from Content Script ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SYNC_BOARDS' && Array.isArray(msg.boards)) {
    chrome.storage.local.set({ boards: msg.boards });
  }
});

// ─── Action (toolbar icon) click ─────────────────────────────────────────────
// Handled by default_popup in manifest — no additional handler needed.
