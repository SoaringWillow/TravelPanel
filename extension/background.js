'use strict';

const DEFAULT_URL = 'http://localhost:3000';

function getSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL }, resolve)
  );
}

async function openClip(url) {
  if (!url) return;
  const { travelpanelUrl } = await getSettings();
  const base = travelpanelUrl.replace(/\/$/, '');
  await chrome.tabs.create({ url: `${base}?import=${encodeURIComponent(url)}` });
}

// Install context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page', 'frame'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    openClip(info.linkUrl);
  } else if (info.menuItemId === 'clip-page') {
    openClip(tab?.url);
  }
});

// Keyboard shortcut handler (Ctrl/Cmd+Shift+S)
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'clip-current-page') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) openClip(tab.url);
});
