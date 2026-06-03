const DEFAULT_APP_URL = 'http://localhost:3000';

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, result => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

async function openInTravelPanel(url) {
  const appUrl = await getAppUrl();
  const targetUrl = `${appUrl}/?import=${encodeURIComponent(url)}`;

  const existing = await chrome.tabs.query({ url: `${appUrl}/*` });
  if (existing.length > 0) {
    await chrome.tabs.update(existing[0].id, { active: true, url: targetUrl });
    await chrome.windows.update(existing[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (url) await openInTravelPanel(url);
});
