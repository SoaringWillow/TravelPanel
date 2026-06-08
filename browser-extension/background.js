const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function openTravelPanel(url) {
  const appUrl = await getAppUrl();
  const target = `${appUrl}?import=${encodeURIComponent(url)}`;

  // Try to find an existing TravelPanel tab
  const tabs = await chrome.tabs.query({ url: `${appUrl}/*` });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true, url: target });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: target });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'clip-to-travelpanel') {
    const url = info.linkUrl || info.pageUrl;
    await openTravelPanel(url);
  }
});

// Allow popup to request opening the app
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OPEN_APP') {
    openTravelPanel(msg.url).then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async
  }
  if (msg.type === 'GET_APP_URL') {
    getAppUrl().then((url) => sendResponse({ url }));
    return true;
  }
});
