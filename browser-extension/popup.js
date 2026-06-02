'use strict';

// ── Platform detection (mirrors app's parse-url.ts, extended for web) ────────

const PLATFORMS = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    test: (u) => u.includes('instagram.com'),
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    test: (u) => u.includes('youtube.com') || u.includes('youtu.be'),
  },
  xiaohongshu: {
    label: 'Little Red Book',
    color: '#FF2442',
    test: (u) => u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('xhs.link'),
  },
  douyin: {
    label: 'Douyin / TikTok',
    color: '#161823',
    test: (u) => u.includes('douyin.com') || u.includes('iesdouyin.com') || u.includes('tiktok.com'),
  },
  bilibili: {
    label: 'Bilibili',
    color: '#00AEEC',
    test: (u) => u.includes('bilibili.com') || u.includes('b23.tv'),
  },
  wechat: {
    label: 'WeChat',
    color: '#07C160',
    test: (u) => u.includes('weixin.qq.com') || u.includes('mp.weixin'),
  },
  pinterest: {
    label: 'Pinterest',
    color: '#E60023',
    test: (u) => u.includes('pinterest.com') || u.includes('pin.it'),
  },
  tripadvisor: {
    label: 'TripAdvisor',
    color: '#34E0A1',
    test: (u) => u.includes('tripadvisor.com'),
  },
  maps: {
    label: 'Google Maps',
    color: '#4285F4',
    test: (u) => u.includes('maps.google.com') || u.includes('goo.gl/maps') || u.includes('maps.app.goo.gl'),
  },
  airbnb: {
    label: 'Airbnb',
    color: '#FF5A5F',
    test: (u) => u.includes('airbnb.com'),
  },
};

function detectPlatform(url) {
  for (const [id, platform] of Object.entries(PLATFORMS)) {
    if (platform.test(url)) return { id, ...platform };
  }
  return { id: 'other', label: 'Web', color: '#6366F1', test: null };
}

// ── State ────────────────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

let currentUrl = '';
let currentTitle = '';
let appUrl = DEFAULT_APP_URL;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const clipState    = document.getElementById('clipState');
const clipContent  = document.getElementById('clipContent');
const noUrlState   = document.getElementById('noUrlState');
const successState = document.getElementById('successState');
const platformBadge = document.getElementById('platformBadge');
const pageTitle    = document.getElementById('pageTitle');
const pageUrl      = document.getElementById('pageUrl');
const saveBtn      = document.getElementById('saveBtn');
const successSub   = document.getElementById('successSub');
const viewBtn      = document.getElementById('viewBtn');
const settingsBtn  = document.getElementById('settingsBtn');
const tabClip      = document.getElementById('tabClip');
const tabOpen      = document.getElementById('tabOpen');

// ── Helpers ──────────────────────────────────────────────────────────────────

function showClipState() {
  clipState.style.display  = 'block';
  successState.style.display = 'none';
}

function showSuccessState(title) {
  clipState.style.display    = 'none';
  successState.style.display = 'flex';
  successSub.textContent     = title || currentUrl;
}

function isBlockedScheme(url) {
  return !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('file://');
}

function buildShareUrl(url, title) {
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load stored app URL
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  appUrl = stored.appUrl || DEFAULT_APP_URL;

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || isBlockedScheme(tab.url)) {
    clipContent.style.display = 'none';
    noUrlState.style.display  = 'block';
    saveBtn.disabled = true;
    return;
  }

  currentUrl   = tab.url;
  currentTitle = tab.title || '';

  const platform = detectPlatform(currentUrl);

  // Render platform badge
  platformBadge.textContent = platform.label;
  platformBadge.style.backgroundColor = platform.color;

  // Render title + URL
  pageTitle.textContent = currentTitle || currentUrl;
  pageUrl.textContent   = currentUrl;
}

// ── Actions ──────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  if (!currentUrl) return;

  const shareUrl = buildShareUrl(currentUrl, currentTitle);
  chrome.tabs.create({ url: shareUrl });
  showSuccessState(currentTitle || currentUrl);
});

viewBtn.addEventListener('click', () => {
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  chrome.tabs.create({ url: base });
  window.close();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

tabClip.addEventListener('click', () => {
  tabClip.classList.add('active');
  tabOpen.classList.remove('active');
  showClipState();
});

tabOpen.addEventListener('click', () => {
  tabOpen.classList.add('active');
  tabClip.classList.remove('active');
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  chrome.tabs.create({ url: base });
  window.close();
});

// ── Boot ─────────────────────────────────────────────────────────────────────

init();
