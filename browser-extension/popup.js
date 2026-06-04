'use strict';

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORMS = [
  { pattern: /instagram\.com/,              label: 'Instagram',    color: '#E1306C' },
  { pattern: /youtube\.com|youtu\.be/,      label: 'YouTube',      color: '#FF0000' },
  { pattern: /xiaohongshu\.com|xhslink\.com/, label: '小红书',     color: '#FF2442' },
  { pattern: /douyin\.com/,                 label: 'Douyin',       color: '#010101' },
  { pattern: /tiktok\.com/,                 label: 'TikTok',       color: '#010101' },
  { pattern: /bilibili\.com/,               label: 'Bilibili',     color: '#00A1D6' },
  { pattern: /weibo\.com/,                  label: 'Weibo',        color: '#E6162D' },
  { pattern: /twitter\.com|x\.com/,         label: 'X',            color: '#1A1A1A' },
  { pattern: /maps\.google\.com|google\.com\/maps/, label: 'Google Maps', color: '#4285F4' },
  { pattern: /tripadvisor\.com/,            label: 'TripAdvisor',  color: '#34E0A1' },
  { pattern: /airbnb\.com/,                 label: 'Airbnb',       color: '#FF5A5F' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { label: 'Web', color: '#6B7280' };
}

// ─── View helpers ─────────────────────────────────────────────────────────────

const views = ['main', 'loading', 'success', 'error', 'empty'];

function showView(name) {
  for (const v of views) {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== name);
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = 'https://travelpanel.app'; // default; overridden from storage

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load app URL from storage
  const stored = await chrome.storage.sync.get(['appUrl']);
  if (stored.appUrl) appUrl = stored.appUrl.replace(/\/$/, '');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const url = tab?.url ?? '';
  const title = tab?.title ?? '';

  // Filter non-clippable URLs
  const isClippable =
    url.startsWith('http://') || url.startsWith('https://');

  if (!isClippable) {
    showView('empty');
    return;
  }

  // Detect platform
  const platform = detectPlatform(url);

  // Update platform badge
  const badge = document.getElementById('platform-badge');
  badge.style.backgroundColor = platform.color;
  document.getElementById('platform-label').textContent = platform.label;

  // Update page info
  const titleEl = document.getElementById('page-title');
  titleEl.textContent = title || url;

  const urlEl = document.getElementById('page-url');
  try {
    const parsed = new URL(url);
    urlEl.textContent = parsed.hostname + parsed.pathname.slice(0, 40) + (parsed.pathname.length > 40 ? '…' : '');
  } catch {
    urlEl.textContent = url.slice(0, 60);
  }

  // Enable the clip button
  const clipBtn = document.getElementById('clip-btn');
  clipBtn.disabled = false;
  clipBtn.addEventListener('click', () => doClip(url, title));

  showView('main');
}

// ─── Clip action ──────────────────────────────────────────────────────────────

async function doClip(url, title) {
  showView('loading');

  try {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;

    // Open the TravelPanel share flow in a new tab
    await chrome.tabs.create({ url: shareUrl, active: true });

    // Track in local storage
    await incrementClipCount();

    // Show success state (popup is still open briefly)
    const subtitle = document.getElementById('success-subtitle');
    subtitle.textContent = title ? `"${title.slice(0, 60)}${title.length > 60 ? '…' : ''}"` : url;

    document.getElementById('open-app-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: appUrl, active: true });
      window.close();
    });

    showView('success');

    // Auto-close after 2.5 seconds
    setTimeout(() => window.close(), 2500);

  } catch (err) {
    console.error('Clip failed:', err);
    document.getElementById('error-msg').textContent =
      'Could not open TravelPanel. Check your app URL in Settings.';
    document.getElementById('retry-btn').addEventListener('click', () => doClip(url, title));
    showView('error');
  }
}

// ─── Clip count tracking ──────────────────────────────────────────────────────

async function incrementClipCount() {
  const { clipCount = 0 } = await chrome.storage.local.get(['clipCount']);
  await chrome.storage.local.set({ clipCount: clipCount + 1 });

  // Update badge
  chrome.action.setBadgeText({ text: String(clipCount + 1) });
  chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
}

// ─── Settings button ──────────────────────────────────────────────────────────

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ─── Start ────────────────────────────────────────────────────────────────────

init().catch((err) => {
  console.error('Popup init error:', err);
  document.getElementById('error-msg').textContent =
    'Failed to load page info. Try refreshing the page first.';
  showView('error');
});
