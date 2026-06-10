'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORM_COLORS = {
  wechat:       '#07C160',
  xiaohongshu:  '#FF2442',
  douyin:       '#161823',
  bilibili:     '#00AEEC',
  other:        '#6366F1',
};

const PLATFORM_LABELS = {
  wechat:       'WeChat',
  xiaohongshu:  'Little Red Book',
  douyin:       'Douyin / TikTok',
  bilibili:     'Bilibili',
  other:        'Web',
};

function detectPlatform(url) {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin'))           return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com'))  return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv'))               return 'bilibili';
  return 'other';
}

// ── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved TravelPanel URL
  const stored = await chrome.storage.sync.get('travelpanelUrl');
  const travelpanelUrl = (stored.travelpanelUrl || '').trim().replace(/\/$/, '');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url    = tab?.url   || '';
  const title  = tab?.title || 'Untitled page';

  // ── Render page info ───────────────────────────────────────────────────────

  const titleEl    = document.getElementById('page-title');
  const urlEl      = document.getElementById('page-url');
  const badgeEl    = document.getElementById('platform-badge');
  const faviconEl  = document.getElementById('favicon');
  const clipBtn    = document.getElementById('clip-btn');
  const cannotEl   = document.getElementById('cannot-clip-notice');
  const setupEl    = document.getElementById('setup-notice');
  const settingsBtn = document.getElementById('settings-btn');

  titleEl.textContent = title;
  urlEl.textContent   = url;

  // Favicon
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
  }

  // Platform badge
  const platform = detectPlatform(url);
  badgeEl.textContent = PLATFORM_LABELS[platform];
  badgeEl.style.backgroundColor = PLATFORM_COLORS[platform];

  // ── Guards ─────────────────────────────────────────────────────────────────

  const isClippable = url.startsWith('http://') || url.startsWith('https://');
  const isConfigured = !!travelpanelUrl;

  if (!isClippable) {
    cannotEl.style.display = 'block';
  }

  if (!isConfigured) {
    setupEl.style.display = 'block';
  }

  if (isClippable && isConfigured) {
    clipBtn.disabled = false;
  }

  // ── Clip action ────────────────────────────────────────────────────────────

  clipBtn.addEventListener('click', () => {
    if (clipBtn.disabled) return;

    const shareUrl = travelpanelUrl +
      '/share?url='   + encodeURIComponent(url) +
      '&title='       + encodeURIComponent(title) +
      '&source=extension';

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
