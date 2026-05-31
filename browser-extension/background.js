const DEFAULT_URL = 'https://travel-panel.vercel.app';

// ── Context menus ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const urlToClip =
    info.menuItemId === 'clip-link' ? info.linkUrl : (info.pageUrl || tab?.url);

  if (!urlToClip) return;

  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl').catch(() => ({}));

  const importUrl = `${travelPanelUrl}?import=${encodeURIComponent(urlToClip)}`;

  try {
    const pattern  = travelPanelUrl.replace(/\/$/, '') + '/*';
    const existing = await chrome.tabs.query({ url: pattern });

    if (existing.length > 0 && existing[0].id) {
      await chrome.tabs.update(existing[0].id, { active: true, url: importUrl });
      if (existing[0].windowId) chrome.windows.update(existing[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: importUrl });
    }
  } catch {
    chrome.tabs.create({ url: importUrl });
  }
});
