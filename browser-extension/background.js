// background.js — TravelPanel Clipper service worker

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim().replace(/\/$/, ''));
    });
  });
}

async function openSharePage(url, title) {
  const appUrl = await getAppUrl();

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title || '')}`;

  chrome.tabs.create({ url: shareUrl });
}

// ── Context menus ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-link') {
    openSharePage(info.linkUrl || '', tab?.title || '');
  } else if (info.menuItemId === 'save-page') {
    openSharePage(tab?.url || info.pageUrl || '', tab?.title || '');
  }
});
