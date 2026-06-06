const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getStoredAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelPanelUrl'], (result) => {
      resolve(result.travelPanelUrl || DEFAULT_APP_URL);
    });
  });
}

async function clipUrl(url) {
  const appBase = await getStoredAppUrl();
  const targetUrl = `${appBase.replace(/\/$/, '')}/?import=${encodeURIComponent(url)}`;

  // Reuse existing TravelPanel tab if open
  const appHost = new URL(appBase).hostname;
  const existingTabs = await chrome.tabs.query({ url: `*://${appHost}/*` });

  if (existingTabs.length > 0) {
    const existing = existingTabs[0];
    await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Clip current page
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip Page to TravelPanel',
    contexts: ['page'],
  });

  // Clip a specific link
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip Link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  await clipUrl(url);
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-current-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) await clipUrl(tab.url);
});
