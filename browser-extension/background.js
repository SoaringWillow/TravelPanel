'use strict';

const DEFAULT_BASE_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  // Right-click on any page → clip it
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  // Right-click on a link → clip the link target
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || tab?.url || info.pageUrl;
  if (!url) return;

  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });

  const params = new URLSearchParams({ url });
  if (!info.linkUrl && tab?.title) params.set('title', tab.title);

  chrome.tabs.create({ url: `${baseUrl.replace(/\/$/, '')}/share?${params.toString()}` });
});

// Badge the extension icon on travel-related sites as a hint
const TRAVEL_HOSTS = [
  'xiaohongshu.com', 'xhslink.com',
  'douyin.com', 'iesdouyin.com',
  'tiktok.com',
  'instagram.com',
  'youtube.com', 'youtu.be',
  'bilibili.com', 'b23.tv',
  'tripadvisor.com', 'airbnb.com', 'booking.com',
];

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url) return;
  updateBadge(tab);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') updateBadge(tab);
});

function updateBadge(tab) {
  try {
    const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
    const isTravelSite = TRAVEL_HOSTS.some((h) => hostname.includes(h));
    chrome.action.setBadgeText({ text: isTravelSite ? '✈' : '', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#2563EB', tabId: tab.id });
  } catch {
    // ignore non-http URLs (chrome://, etc.)
  }
}
