'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
      resolve((appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

function buildShareUrl(base, url, title = '') {
  const params = new URLSearchParams({ url, title });
  return `${base}/share?${params.toString()}`;
}

// ── Context menus ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const base = await getAppUrl();

  const targetUrl   = info.menuItemId === 'save-link' ? info.linkUrl : (info.pageUrl || tab?.url || '');
  const targetTitle = info.menuItemId === 'save-link' ? (info.selectionText || '') : (tab?.title || '');

  if (!targetUrl) return;

  chrome.tabs.create({ url: buildShareUrl(base, targetUrl, targetTitle) });
});

// ── Keyboard shortcut (Alt+Shift+T / Cmd+Shift+T) ─────────────
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'save-current-page') return;

  const base = await getAppUrl();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  chrome.tabs.create({ url: buildShareUrl(base, tab.url, tab.title || '') });
});
