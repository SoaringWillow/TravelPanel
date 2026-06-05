// ── TravelPanel Browser Extension — Background Service Worker ────────────────

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || '';

  if (!url) return;

  chrome.storage.sync.get(['appUrl'], (result) => {
    const appUrl = result.appUrl || DEFAULT_APP_URL;
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
  });
});

// ── Keyboard shortcut (Alt+Shift+C / Option+Shift+C) ─────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'clip-page') return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url) return;

    chrome.storage.sync.get(['appUrl'], (result) => {
      const appUrl = result.appUrl || DEFAULT_APP_URL;
      const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
      chrome.tabs.create({ url: shareUrl });
    });
  });
});
