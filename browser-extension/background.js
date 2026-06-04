// Service worker — registers context menu and handles background clips

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
      resolve(data.appUrl.replace(/\/$/, ''));
    });
  });
}

function buildShareUrl(appUrl, pageUrl, title) {
  return `${appUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title || '')}`;
}

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel ✈️',
    contexts: ['page', 'link'],
  });

  chrome.contextMenus.create({
    id: 'clip-link-to-travelpanel',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();
  let clipUrl, clipTitle;

  if (info.menuItemId === 'clip-link-to-travelpanel' && info.linkUrl) {
    clipUrl = info.linkUrl;
    clipTitle = info.selectionText || tab?.title || '';
  } else {
    clipUrl = tab?.url || info.pageUrl;
    clipTitle = tab?.title || '';
  }

  if (!clipUrl) return;

  const shareUrl = buildShareUrl(appUrl, clipUrl, clipTitle);
  chrome.tabs.create({ url: shareUrl });
});

// Expose helper for popup to use via messaging
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_APP_URL') {
    getAppUrl().then((url) => sendResponse({ url }));
    return true; // async
  }
  if (msg.type === 'OPEN_SHARE') {
    getAppUrl().then((appUrl) => {
      const shareUrl = buildShareUrl(appUrl, msg.url, msg.title);
      chrome.tabs.create({ url: shareUrl });
      sendResponse({ ok: true });
    });
    return true;
  }
});
