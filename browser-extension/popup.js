'use strict';

const DEFAULT_APP_URL = 'https://your-travelpanel.vercel.app';

const PLATFORMS = [
  { pattern: /instagram\.com/,           name: 'Instagram',    emoji: '📸', bg: '#FDF2F8', fg: '#9D174D', border: '#FBCFE8' },
  { pattern: /youtube\.com|youtu\.be/,   name: 'YouTube',      emoji: '▶️', bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' },
  { pattern: /xiaohongshu\.com|xhslink/, name: '小红书',        emoji: '📕', bg: '#FEF2F2', fg: '#BE123C', border: '#FECDD3' },
  { pattern: /tiktok\.com/,              name: 'TikTok',       emoji: '🎵', bg: '#F0F9FF', fg: '#0369A1', border: '#BAE6FD' },
  { pattern: /x\.com|twitter\.com/,      name: 'X (Twitter)',  emoji: '✕',  bg: '#F8FAFC', fg: '#0F172A', border: '#E2E8F0' },
  { pattern: /tripadvisor\.com/,         name: 'TripAdvisor',  emoji: '🦉', bg: '#F0FDF4', fg: '#15803D', border: '#BBF7D0' },
  { pattern: /booking\.com/,             name: 'Booking.com',  emoji: '🏨', bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' },
  { pattern: /airbnb\.com/,              name: 'Airbnb',       emoji: '🏠', bg: '#FFF1F2', fg: '#BE123C', border: '#FECDD3' },
  { pattern: /maps\.google\.com|google\.com\/maps/, name: 'Google Maps', emoji: '🗺️', bg: '#F0FDF4', fg: '#15803D', border: '#BBF7D0' },
  { pattern: /maps\.apple\.com/,         name: 'Apple Maps',   emoji: '🍎', bg: '#F8FAFC', fg: '#475569', border: '#E2E8F0' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { name: 'Web page', emoji: '🌐', bg: '#F0FDF4', fg: '#16A34A', border: '#BBF7D0' };
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 40) + (u.pathname.length > 40 ? '…' : '');
  } catch {
    return url.slice(0, 50);
  }
}

function getFaviconUrl(pageUrl) {
  try {
    const { hostname } = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return '';
  }
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => resolve(appUrl));
  });
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  banner.textContent = msg;
  banner.style.display = 'block';
}

function showSuccess(subtitle) {
  document.querySelector('.content').style.display = 'none';
  const state = document.getElementById('success-state');
  document.getElementById('success-sub').textContent = subtitle;
  state.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async () => {
  let tab;
  let appUrl = DEFAULT_APP_URL;

  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    appUrl = await getAppUrl();
  } catch (err) {
    showError('Could not read current tab. Try reloading the page.');
    return;
  }

  if (!tab?.url) {
    showError('No URL found for this tab.');
    return;
  }

  // Populate page info
  document.getElementById('favicon').src = getFaviconUrl(tab.url);

  document.getElementById('page-info-loading').style.display = 'none';
  const pageInfo = document.getElementById('page-info');
  pageInfo.style.display = 'block';
  document.getElementById('page-title').textContent = tab.title || 'Untitled page';
  document.getElementById('page-url').textContent = truncateUrl(tab.url);

  // Platform badge
  const platform = detectPlatform(tab.url);
  const badge = document.getElementById('platform-badge');
  badge.textContent = `${platform.emoji} ${platform.name}`;
  badge.style.background = platform.bg;
  badge.style.color = platform.fg;
  badge.style.borderColor = platform.border;

  // Enable save
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = false;

  // Open app link
  document.getElementById('open-app-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  // Settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Save
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Opening…';

    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;

    try {
      // Open in a focused popup window for in-context experience
      await chrome.windows.create({
        url: shareUrl,
        type: 'popup',
        width: 480,
        height: 640,
        focused: true,
      });
      showSuccess('TravelPanel is extracting your clip…');
      setTimeout(() => window.close(), 1800);
    } catch {
      // Fallback: open as a new tab
      chrome.tabs.create({ url: shareUrl });
      showSuccess('Opened in a new tab.');
      setTimeout(() => window.close(), 1500);
    }
  });
});
