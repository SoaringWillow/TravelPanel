'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], r => resolve((r.appUrl || '').trim() || DEFAULT_APP_URL));
  });
}

/* Keyboard shortcut: Ctrl+Shift+S / Cmd+Shift+S */
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'clip-page') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const url = tab.url;
  if (/^(chrome|chrome-extension|edge|about|brave|file):\/\//i.test(url)) return;

  const appUrl  = await getAppUrl();
  const base    = appUrl.replace(/\/$/, '');
  const clipUrl = `${base}?import=${encodeURIComponent(url)}`;

  const tabs  = await chrome.tabs.query({});
  const tpTab = tabs.find(t => t.url?.startsWith(base));

  if (tpTab) {
    await chrome.tabs.update(tpTab.id, { url: clipUrl, active: true });
    if (tpTab.windowId) await chrome.windows.update(tpTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: clipUrl });
  }
});

/* Context menu: right-click any link → Clip to TravelPanel */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });

  chrome.contextMenus?.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  const url     = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;

  const appUrl  = await getAppUrl();
  const base    = appUrl.replace(/\/$/, '');
  const clipUrl = `${base}?import=${encodeURIComponent(url)}`;

  const tabs  = await chrome.tabs.query({});
  const tpTab = tabs.find(t => t.url?.startsWith(base));

  if (tpTab) {
    await chrome.tabs.update(tpTab.id, { url: clipUrl, active: true });
    if (tpTab.windowId) await chrome.windows.update(tpTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: clipUrl });
  }
});
