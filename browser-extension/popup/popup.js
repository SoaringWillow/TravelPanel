'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection — mirrors the server-side list in lib/parse-url.ts
const PLATFORMS = [
  { id: 'youtube', label: '▶ YouTube', pattern: /youtube\.com|youtu\.be/ },
  { id: 'instagram', label: '📷 Instagram', pattern: /instagram\.com/ },
  { id: 'xiaohongshu', label: '📕 Xiaohongshu', pattern: /xiaohongshu\.com|xhslink\.com/ },
  { id: 'tiktok', label: '♪ TikTok', pattern: /tiktok\.com|douyin\.com/ },
  { id: 'bilibili', label: '📺 Bilibili', pattern: /bilibili\.com|b23\.tv/ },
  { id: 'wechat', label: '💬 WeChat', pattern: /weixin\.qq\.com|mp\.weixin/ },
  { id: 'travel', label: '✈ Travel Blog', pattern: /tripadvisor|lonelyplanet|nomadicmatt|travel/ },
];

function detectPlatform(url) {
  if (!url) return null;
  return PLATFORMS.find(p => p.pattern.test(url)) || null;
}

function isBlockedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('file://')
  );
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, result => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

function showState(id) {
  const states = ['loading-state', 'blocked-state', 'main-state', 'saving-state', 'success-state', 'error-state'];
  states.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
}

async function init() {
  showState('loading-state');

  let tab;
  try {
    const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = current;
  } catch {
    showState('error-state');
    return;
  }

  if (!tab || isBlockedUrl(tab.url)) {
    showState('blocked-state');
    return;
  }

  // Populate URL card
  const titleEl = document.getElementById('page-title');
  const domainEl = document.getElementById('page-domain');
  const badgeEl = document.getElementById('platform-badge');
  const faviconEl = document.getElementById('page-favicon');

  const title = tab.title || 'Untitled Page';
  const domain = (() => {
    try { return new URL(tab.url).hostname.replace(/^www\./, ''); }
    catch { return tab.url; }
  })();

  titleEl.textContent = truncate(title, 80);
  titleEl.title = title;
  domainEl.textContent = domain;

  // Favicon
  try {
    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    img.alt = '';
    img.width = 16;
    img.height = 16;
    faviconEl.appendChild(img);
  } catch { /* skip favicon */ }

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform) {
    badgeEl.textContent = platform.label;
    badgeEl.className = `platform-badge ${platform.id}`;
    badgeEl.classList.remove('hidden');
  }

  showState('main-state');

  // Save button handler
  document.getElementById('save-btn').addEventListener('click', () => save(tab));
}

async function save(tab) {
  showState('saving-state');

  try {
    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
    await chrome.tabs.create({ url: shareUrl, active: true });
    showState('success-state');
    setTimeout(() => window.close(), 1800);
  } catch (err) {
    const msgEl = document.getElementById('error-message');
    if (msgEl) msgEl.textContent = err?.message || 'Failed to open TravelPanel.';
    showState('error-state');
  }
}

// Retry button
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('retry-btn')?.addEventListener('click', () => init());

  document.getElementById('open-settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
