'use strict';

// Service worker for TravelPanel Clipper extension

const DEFAULT_APP_URL = 'http://localhost:3000';

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BOARDS') {
    fetchBoards(message.appUrl)
      .then(boards => sendResponse({ boards }))
      .catch(() => sendResponse({ boards: [] }));
    return true; // keep channel open for async response
  }
});

async function fetchBoards(appUrl) {
  // The boards are stored in IndexedDB on the TravelPanel origin.
  // We can't directly access IndexedDB from a service worker of a different origin.
  // Instead, we'll try to fetch the board list from a dedicated API endpoint
  // or fall back to an empty list.
  //
  // For a full integration, TravelPanel would expose a GET /api/boards endpoint.
  // Until then, we return an empty array so the popup shows inbox-only mode.
  return [];
}

// Set up context menu for quick clipping (right-click → Save to TravelPanel)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrl = stored.appUrl || DEFAULT_APP_URL;

  // Use the link URL if right-clicking a link, otherwise the page URL
  const targetUrl = info.linkUrl || info.pageUrl;
  const title = tab?.title || '';

  const params = new URLSearchParams({ url: targetUrl, title });
  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?${params.toString()}`;

  chrome.tabs.create({ url: shareUrl });
});
