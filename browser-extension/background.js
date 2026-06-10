'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

// ─── Install: create context menus ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Right-click on a page → clip the page
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  // Right-click on a link → clip the link URL
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// ─── Context menu click handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl =
    info.menuItemId === 'clip-link' ? info.linkUrl :
    info.menuItemId === 'clip-page' ? (info.pageUrl || tab?.url) :
    null;

  if (!targetUrl) return;

  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl');

  // Persist to recent clips
  const { recentClips = [] } = await chrome.storage.sync.get('recentClips');
  const newClip = {
    url: targetUrl,
    title: tab?.title || targetUrl,
    clippedAt: Date.now(),
  };
  const updated = [newClip, ...recentClips.filter(c => c.url !== targetUrl)].slice(0, 10);
  await chrome.storage.sync.set({ recentClips: updated });

  // Open TravelPanel with the URL
  const dest = new URL(travelPanelUrl);
  dest.pathname = '/';
  dest.searchParams.set('import', targetUrl);
  chrome.tabs.create({ url: dest.toString() });
});
