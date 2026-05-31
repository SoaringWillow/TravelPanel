'use strict';

// Create right-click context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-page' && info.menuItemId !== 'clip-link') return;

  const { travelpanelUrl } = await chrome.storage.sync.get(['travelpanelUrl']);
  const appUrl = (travelpanelUrl || '').replace(/\/$/, '');

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.linkUrl || info.pageUrl;
  const title = info.menuItemId === 'clip-page' ? (tab?.title || '') : '';

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(targetUrl)}` +
    `&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-page') return;

  const { travelpanelUrl } = await chrome.storage.sync.get(['travelpanelUrl']);
  const appUrl = (travelpanelUrl || '').replace(/\/$/, '');

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(tab.url)}` +
    `&title=${encodeURIComponent(tab.title || '')}`;

  chrome.tabs.create({ url: shareUrl });
});
