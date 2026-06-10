// ─── Context menu setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Right-click on a link
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  // Right-click on page background
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
});

// ─── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const stored = await chrome.storage.sync.get(['appUrl']);
  const baseUrl = (stored.appUrl || '').replace(/\/$/, '');

  if (!baseUrl || baseUrl === 'https://your-app.vercel.app') {
    // No URL configured — open extension popup settings
    chrome.action.openPopup?.();
    return;
  }

  let clipUrl, title;

  if (info.menuItemId === 'clip-link') {
    clipUrl = info.linkUrl;
    title = info.selectionText || info.linkUrl;
  } else {
    clipUrl = tab.url;
    title = tab.title || tab.url;
  }

  if (!clipUrl) return;

  const params = new URLSearchParams({ url: clipUrl, title: title || clipUrl });
  const shareUrl = `${baseUrl}/share?${params.toString()}`;
  chrome.tabs.create({ url: shareUrl, active: true });
});
