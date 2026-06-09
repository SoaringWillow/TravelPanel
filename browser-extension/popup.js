'use strict';

const DEFAULT_APP_URL = '';

const PLATFORM_PATTERNS = [
  { id: 'wechat',      label: 'WeChat',     patterns: ['weixin.qq.com', 'mp.weixin'] },
  { id: 'xiaohongshu', label: '小红书',      patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'] },
  { id: 'douyin',      label: 'Douyin',     patterns: ['douyin.com', 'iesdouyin.com', 'tiktok.com'] },
  { id: 'bilibili',    label: 'Bilibili',   patterns: ['bilibili.com', 'b23.tv'] },
];

function detectPlatform(url) {
  const lower = url.toLowerCase();
  for (const p of PLATFORM_PATTERNS) {
    if (p.patterns.some((pat) => lower.includes(pat))) return p;
  }
  return null;
}

function isInternalUrl(url) {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('safari-extension://') ||
    !url.startsWith('http')
  );
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function isMac() {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');

  const url    = tab?.url   || '';
  const title  = tab?.title || 'Untitled';
  const faviconUrl = tab?.favIconUrl || '';

  // Populate page info
  document.getElementById('page-title').textContent = truncate(title, 60);
  document.getElementById('page-url').textContent   = truncate(url, 55);

  // Favicon
  const faviconEl      = document.getElementById('page-favicon');
  const placeholderEl  = document.getElementById('favicon-placeholder');
  if (faviconUrl) {
    faviconEl.src = faviconUrl;
    faviconEl.onload  = () => { faviconEl.classList.add('loaded'); placeholderEl.style.display = 'none'; };
    faviconEl.onerror = () => { /* keep placeholder */ };
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    const wrap = document.getElementById('platform-wrap');
    wrap.style.display = 'block';
    wrap.style.marginBottom = '0';
    wrap.style.marginTop = '10px';
    const badge = document.createElement('span');
    badge.className = `platform-badge ${platform.id}`;
    badge.textContent = platform.label;
    wrap.appendChild(badge);
  }

  // Keyboard shortcut label
  const shortcutEl = document.getElementById('shortcut-key');
  shortcutEl.textContent = isMac() ? '⌘⇧S' : 'Ctrl+Shift+S';

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  document.getElementById('open-settings-link')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const clipBtn = document.getElementById('clip-btn');

  // Guard: internal URL
  if (isInternalUrl(url)) {
    document.getElementById('internal-url-banner').style.display = 'flex';
    document.getElementById('shortcut-hint').style.display = 'none';
    clipBtn.disabled = true;
    return;
  }

  // Guard: not configured
  if (!appUrl) {
    document.getElementById('not-configured-banner').style.display = 'flex';
    clipBtn.disabled = true;
    return;
  }

  // Ready
  clipBtn.disabled = false;
  clipBtn.addEventListener('click', () => doClip(url, title, appUrl));
}

function doClip(url, title, appUrl) {
  const base = appUrl.replace(/\/$/, '');
  const clipUrl = `${base}/?import=${encodeURIComponent(url)}`;

  // Show success flash briefly before opening
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('success-wrap').classList.add('visible');

  setTimeout(() => {
    chrome.tabs.create({ url: clipUrl });
    window.close();
  }, 600);
}

init().catch(console.error);
