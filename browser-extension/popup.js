'use strict';

const PLATFORMS = {
  'xiaohongshu.com': { label: 'Little Red Book', color: '#FF2442' },
  'xhslink.com':     { label: 'Little Red Book', color: '#FF2442' },
  'xhs.link':        { label: 'Little Red Book', color: '#FF2442' },
  'weixin.qq.com':   { label: 'WeChat',           color: '#07C160' },
  'mp.weixin.qq.com':{ label: 'WeChat',           color: '#07C160' },
  'bilibili.com':    { label: 'Bilibili',         color: '#00AEEC' },
  'b23.tv':          { label: 'Bilibili',         color: '#00AEEC' },
  'douyin.com':      { label: 'Douyin',           color: '#161823' },
  'iesdouyin.com':   { label: 'Douyin',           color: '#161823' },
  'tiktok.com':      { label: 'TikTok',           color: '#161823' },
  'youtube.com':     { label: 'YouTube',          color: '#FF0000' },
  'youtu.be':        { label: 'YouTube',          color: '#FF0000' },
  'instagram.com':   { label: 'Instagram',        color: '#C13584' },
  'twitter.com':     { label: 'Twitter / X',      color: '#1DA1F2' },
  'x.com':           { label: 'Twitter / X',      color: '#1A8CD8' },
  'maps.google.com': { label: 'Google Maps',      color: '#4285F4' },
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (host === domain || host.endsWith('.' + domain)) return info;
    }
  } catch (_) {}
  return { label: 'Web', color: '#6366f1' };
}

function isClippablePage(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    let s = u.hostname.replace(/^www\./, '') + u.pathname;
    if (s.length > 48) s = s.slice(0, 46) + '…';
    return s;
  } catch (_) {
    return url.slice(0, 48);
  }
}

async function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelPanelUrl'], (result) => {
      resolve(result.travelPanelUrl || 'http://localhost:3000');
    });
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || 'Untitled';

  if (!isClippablePage(url)) {
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('blockedSection').style.display = 'block';
    return;
  }

  // Fill in page preview
  const { label, color } = detectPlatform(url);
  const badge = document.getElementById('platformBadge');
  badge.style.background = color;
  document.getElementById('platformLabel').textContent = label;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = truncateUrl(url);

  // Clip button handler
  document.getElementById('clipBtn').addEventListener('click', async () => {
    const btn = document.getElementById('clipBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const base     = await getTravelPanelUrl();
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    chrome.tabs.create({ url: shareUrl, active: true });

    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('successSection').classList.add('visible');
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init().catch(console.error);
