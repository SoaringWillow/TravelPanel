'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORMS = [
  { id: 'xiaohongshu', label: 'Little Red Book', color: '#FF2442', icon: '📕',
    test: (u) => u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('xhs.link') },
  { id: 'wechat', label: 'WeChat', color: '#07C160', icon: '💚',
    test: (u) => u.includes('weixin.qq.com') || u.includes('mp.weixin') },
  { id: 'douyin', label: 'Douyin / TikTok', color: '#161823', icon: '🎵',
    test: (u) => u.includes('douyin.com') || u.includes('iesdouyin.com') || u.includes('tiktok.com') },
  { id: 'bilibili', label: 'Bilibili', color: '#00AEEC', icon: '📺',
    test: (u) => u.includes('bilibili.com') || u.includes('b23.tv') },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: '📸',
    test: (u) => u.includes('instagram.com') },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', icon: '▶️',
    test: (u) => u.includes('youtube.com') || u.includes('youtu.be') },
  { id: 'tripadvisor', label: 'TripAdvisor', color: '#34E0A1', icon: '🦉',
    test: (u) => u.includes('tripadvisor.') },
  { id: 'google_maps', label: 'Google Maps', color: '#4285F4', icon: '📍',
    test: (u) => u.includes('maps.google.') || u.includes('goo.gl/maps') },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6366f1', icon: '🌐' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncateUrl(url, max = 55) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function isClippable(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

// ── DOM refs ─────────────────────────────────────────────────────────────────

const clipView     = document.getElementById('clipView');
const successView  = document.getElementById('successView');
const noUrlView    = document.getElementById('noUrlView');
const errorBanner  = document.getElementById('errorBanner');

const platformBadge = document.getElementById('platform-badge');
const pageTitleEl   = document.getElementById('pageTitle');
const pageUrlEl     = document.getElementById('pageUrl');

const clipBtn      = document.getElementById('clipBtn');
const btnIcon      = document.getElementById('btnIcon');
const btnText      = document.getElementById('btnText');
const btnSpinner   = document.getElementById('btnSpinner');

const successSubtitle = document.getElementById('successSubtitle');
const viewBtn      = document.getElementById('viewBtn');
const settingsBtn  = document.getElementById('settingsBtn');

// ── State ─────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ── Init ──────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) appUrl = result.appUrl.replace(/\/$/, '');
  loadCurrentTab();
});

function loadCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0] || null;
    const url = currentTab?.url || '';

    if (!isClippable(url)) {
      showView('noUrl');
      return;
    }

    const platform = detectPlatform(url);
    const title = currentTab?.title || url;

    platformBadge.style.background = platform.color;
    platformBadge.textContent = `${platform.icon} ${platform.label}`;

    pageTitleEl.textContent = title;
    pageUrlEl.textContent = truncateUrl(url);

    showView('clip');
  });
}

// ── Clip action ───────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentTab) return;

  const url = currentTab.url;
  const title = currentTab.title || '';

  setLoading(true);
  hideError();

  try {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl });
    successSubtitle.textContent = 'Opening TravelPanel…';
    showView('success');
  } catch (err) {
    showError('Could not open TravelPanel. Check your settings.');
    setLoading(false);
  }
});

viewBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl });
  window.close();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── UI helpers ────────────────────────────────────────────────────────────────

function showView(name) {
  clipView.style.display    = name === 'clip'    ? 'block' : 'none';
  successView.style.display = name === 'success' ? 'flex'  : 'none';
  noUrlView.style.display   = name === 'noUrl'   ? 'flex'  : 'none';
}

function setLoading(on) {
  clipBtn.disabled = on;
  btnIcon.style.display    = on ? 'none'   : 'inline';
  btnText.textContent      = on ? 'Opening…' : 'Clip to TravelPanel';
  btnSpinner.style.display = on ? 'block'  : 'none';
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}

function hideError() {
  errorBanner.style.display = 'none';
}
