'use strict';

const STORAGE_KEY = 'travelPanelUrl';
const CONTEXT_MENU_ID = 'clip-to-travelpanel';

// Set up right-click context menu on install / startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  const result = await chrome.storage.sync.get([STORAGE_KEY]);
  const travelPanelUrl = result[STORAGE_KEY];

  if (!travelPanelUrl) {
    // Open popup so user can configure
    chrome.action.openPopup?.();
    return;
  }

  // Prefer the link URL if right-clicked on a link, else the page URL
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  const targetTitle = tab?.title || '';

  if (!targetUrl) return;

  const params = new URLSearchParams({ url: targetUrl });
  if (targetTitle) params.set('title', targetTitle);

  const clipUrl = `${travelPanelUrl}/share?${params.toString()}`;
  chrome.tabs.create({ url: clipUrl, active: true });
});
