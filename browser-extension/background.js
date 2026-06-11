'use strict';

const PLATFORM_META = {
  wechat:      { label: 'WeChat',      color: '#07C160' },
  xiaohongshu: { label: '小红书',       color: '#FF2442' },
  douyin:      { label: 'Douyin',      color: '#161823' },
  bilibili:    { label: 'Bilibili',    color: '#00AEEC' },
  other:       { label: 'Web',         color: '#6366F1' },
};

function detectPlatform(url) {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

// ── Context menu setup ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip this page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

// ── Context menu click ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-page' && info.menuItemId !== 'clip-link') return;

  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');
  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url   = (info.menuItemId === 'clip-link' ? info.linkUrl : tab?.url) || '';
  const title = (info.menuItemId === 'clip-link' ? ''           : tab?.title) || '';

  const base     = travelpanelUrl.replace(/\/+$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  chrome.tabs.create({ url: shareUrl });
});

// ── Badge colour reflects configured state ──────────────────────────────────

chrome.storage.onChanged.addListener(async (changes) => {
  if (!('travelpanelUrl' in changes)) return;

  const url = changes.travelpanelUrl.newValue || '';
  await chrome.action.setBadgeText({ text: url ? '' : '!' });
  await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
});

// Set badge on startup if not yet configured
chrome.storage.sync.get('travelpanelUrl', ({ travelpanelUrl = '' }) => {
  chrome.action.setBadgeText({ text: travelpanelUrl ? '' : '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
});
