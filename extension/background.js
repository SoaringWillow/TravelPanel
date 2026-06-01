/* TravelPanel Extension — background service worker */

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Context menu: right-click any link to clip it
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url   = info.linkUrl || info.pageUrl || '';
  const title = tab?.title   || url;

  chrome.storage.sync.get(['appUrl'], (result) => {
    const base   = (result.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
    const target = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: target });
  });
});
