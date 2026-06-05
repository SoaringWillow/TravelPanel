'use strict';

// ─── Context menu ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       'clip-to-travelpanel',
    title:    'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
    const base = (appUrl || '').replace(/\/$/, '');
    if (!base) {
      chrome.runtime.openOptionsPage();
      return;
    }

    const targetUrl   = info.linkUrl || info.pageUrl || tab?.url || '';
    const targetTitle = encodeURIComponent(tab?.title || '');
    const encoded     = encodeURIComponent(targetUrl);

    chrome.windows.create({
      url:    `${base}/share?url=${encoded}&title=${targetTitle}`,
      type:   'popup',
      width:  480,
      height: 640,
      focused: true,
    });
  });
});
