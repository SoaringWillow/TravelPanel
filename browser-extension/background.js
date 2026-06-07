// ─── Context menu setup ────────────────────────────────────────────────────

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

// ─── Context menu click ────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = (appUrl || '').replace(/\/$/, '');

  if (!base) {
    // Open options page so user can configure the URL
    chrome.runtime.openOptionsPage();
    return;
  }

  let url   = '';
  let title = '';

  if (info.menuItemId === 'clip-link') {
    url   = info.linkUrl || '';
    title = info.selectionText || url;
  } else {
    url   = tab?.url || '';
    title = tab?.title || '';
  }

  if (!url) return;

  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});

// ─── Keyboard shortcut (optional) ─────────────────────────────────────────

chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'quick-clip') return;

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = (appUrl || '').replace(/\/$/, '');
  if (!base) { chrome.runtime.openOptionsPage(); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const shareUrl = `${base}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
  chrome.tabs.create({ url: shareUrl });
});
