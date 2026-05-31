'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection — ordered from most to least specific
const PLATFORMS = [
  { domains: ['instagram.com'],    name: 'Instagram',   color: '#E1306C', emoji: '📸' },
  { domains: ['youtube.com', 'youtu.be'], name: 'YouTube', color: '#FF0000', emoji: '▶️' },
  { domains: ['xiaohongshu.com', 'xhslink.com'], name: '小红书', color: '#FF2442', emoji: '📕' },
  { domains: ['douyin.com'],       name: 'Douyin',      color: '#161823', emoji: '🎵' },
  { domains: ['tiktok.com'],       name: 'TikTok',      color: '#161823', emoji: '🎵' },
  { domains: ['bilibili.com'],     name: 'Bilibili',    color: '#00A1D6', emoji: '📺' },
  { domains: ['weibo.com'],        name: 'Weibo',       color: '#E6162D', emoji: '🔴' },
  { domains: ['x.com'],           name: 'X',           color: '#1a1a1a', emoji: '𝕏' },
  { domains: ['twitter.com'],     name: 'Twitter',     color: '#1DA1F2', emoji: '🐦' },
  { domains: ['maps.google.com'], name: 'Google Maps', color: '#4285F4', emoji: '🗺️' },
  { domains: ['tripadvisor.com'], name: 'TripAdvisor', color: '#34E0A1', emoji: '🦉' },
  { domains: ['airbnb.com'],      name: 'Airbnb',      color: '#FF5A5F', emoji: '🏠' },
  { domains: ['booking.com'],     name: 'Booking.com', color: '#003580', emoji: '🏨' },
];

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const p of PLATFORMS) {
      if (p.domains.some(d => hostname === d || hostname.endsWith('.' + d))) return p;
    }
  } catch {}
  return null;
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

// Convert #RRGGBB to rgba(r,g,b,alpha) string
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const mainContent  = document.getElementById('mainContent');
  const nonWebState  = document.getElementById('nonWebState');
  const successState = document.getElementById('successState');
  const badge        = document.getElementById('platformBadge');
  const titleEl      = document.getElementById('pageTitle');
  const urlEl        = document.getElementById('pageUrl');
  const saveBtn      = document.getElementById('saveBtn');
  const optionsBtn   = document.getElementById('optionsBtn');
  const kbdMac       = document.getElementById('kbdMac');
  const kbdOther     = document.getElementById('kbdOther');

  const url   = tab?.url   || '';
  const title = tab?.title || '';

  // Show keyboard shortcut hint for platform
  const isMac = navigator.platform.toLowerCase().includes('mac');
  if (isMac) kbdMac.style.display = 'inline';
  else kbdOther.style.display = 'inline';

  // Non-web pages (new tab, chrome://, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    mainContent.style.display = 'none';
    nonWebState.style.display = 'block';
    return;
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    badge.textContent = `${platform.emoji} ${platform.name}`;
    badge.style.background    = hexAlpha(platform.color, 0.12);
    badge.style.color         = platform.color;
    badge.style.borderColor   = hexAlpha(platform.color, 0.3);
  }

  // Page info
  titleEl.textContent = title || 'Untitled page';
  try {
    const u = new URL(url);
    const display = u.hostname.replace(/^www\./, '') + u.pathname;
    urlEl.textContent = display.length > 46 ? display.slice(0, 43) + '…' : display;
  } catch {
    urlEl.textContent = url;
  }

  // Save handler
  saveBtn.addEventListener('click', () => openShare(url, title));

  // Settings
  optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
});

async function openShare(url, title) {
  const saveBtn = document.getElementById('saveBtn');
  const mainContent  = document.getElementById('mainContent');
  const successState = document.getElementById('successState');

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Opening…';

  const appUrl   = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  await chrome.tabs.create({ url: shareUrl });

  mainContent.style.display  = 'none';
  successState.style.display = 'flex';

  setTimeout(() => window.close(), 1800);
}
