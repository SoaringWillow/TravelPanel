// Service worker — context menu + install setup

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
      resolve(appUrl.trim() || DEFAULT_APP_URL);
    });
  });
}

// ── Install / update ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       'save-to-travelpanel',
    title:    'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
  chrome.contextMenus.create({
    id:       'save-link-to-travelpanel',
    title:    'Save this link to TravelPanel',
    contexts: ['link'],
  });
});

// ── Context menu handler ──────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();

  let url   = '';
  let title = '';

  if (info.menuItemId === 'save-link-to-travelpanel' && info.linkUrl) {
    url   = info.linkUrl;
    title = info.selectionText || '';
  } else {
    url   = info.pageUrl || tab?.url || '';
    title = tab?.title  || '';
  }

  if (!url) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Re-use an existing TravelPanel tab or open new
  const allTabs       = await chrome.tabs.query({});
  const existingTab   = allTabs.find((t) => t.url && t.url.startsWith(appUrl));

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { active: true, url: shareUrl });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: shareUrl });
  }
});
