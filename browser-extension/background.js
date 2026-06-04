/* background.js — TravelPanel Clipper service worker */
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!['clip-page', 'clip-link'].includes(info.menuItemId)) return;

  const url    = info.menuItemId === 'clip-link' ? (info.linkUrl || info.pageUrl) : (info.pageUrl || tab?.url || '');
  const title  = tab?.title || '';

  const { appUrl = '' } = await chrome.storage.local.get('appUrl');
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const platform = detectPlatform(url);

  const clip = {
    id: crypto.randomUUID(),
    url,
    title,
    platform,
    clippedAt: Date.now(),
  };

  const { pendingClips = [] } = await chrome.storage.local.get('pendingClips');
  pendingClips.push(clip);
  await chrome.storage.local.set({ pendingClips });

  await chrome.action.setBadgeText({ text: String(pendingClips.length) });
  await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
});

function detectPlatform(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('instagram'))                         return 'instagram';
    if (h.includes('xiaohongshu') || h.includes('xhslink')) return 'xiaohongshu';
    if (h.includes('tiktok') || h.includes('douyin'))   return 'tiktok';
    if (h.includes('twitter') || h.includes('x.com'))   return 'twitter';
    if (h.includes('bilibili'))                          return 'bilibili';
  } catch { /* ignore */ }
  return 'other';
}
