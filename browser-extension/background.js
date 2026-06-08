// ─── Context menu setup ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// ─── Context menu click handler ──────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  if (!url) return;

  const { travelPanelUrl } = await chrome.storage.sync.get(['travelPanelUrl']);
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const title = (info.selectionText || tab?.title || '').slice(0, 200);
  const shareUrl = `${travelPanelUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});

// ─── Extension icon badge (optional: shows '✓' after clip) ──────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'clip_success') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#059669' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
  }
});
