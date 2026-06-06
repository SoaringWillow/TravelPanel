// ─── Context menus ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: '📌 Clip this page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: '📌 Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// ─── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const stored = await chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' });
  const baseUrl = stored.travelPanelUrl.replace(/\/$/, '');

  let targetUrl, title;

  if (info.menuItemId === 'clip-link') {
    targetUrl = info.linkUrl ?? '';
    // Use selected text as a hint for the title, fall back to URL
    title = info.selectionText?.trim() || targetUrl;
  } else {
    targetUrl = tab?.url ?? info.pageUrl ?? '';
    title = tab?.title ?? '';
  }

  if (!targetUrl) return;

  const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});

// ─── Keyboard command handler ─────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const stored = await chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' });
  const baseUrl = stored.travelPanelUrl.replace(/\/$/, '');

  const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title ?? '')}`;
  chrome.tabs.create({ url: shareUrl });
});
