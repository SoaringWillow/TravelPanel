'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection — mirrors lib/parse-url.ts in the main app
function detectPlatform(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com/.test(url)) return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili';
  if (/weixin\.qq\.com|mp\.weixin/.test(url)) return 'wechat';
  return 'other';
}

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  xiaohongshu: '小红书',
  douyin: '抖音',
  bilibili: 'Bilibili',
  wechat: 'WeChat',
  other: 'Web',
};

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function showEl(id) { document.getElementById(id).style.display = ''; }
function hideEl(id) { document.getElementById(id).style.display = 'none'; }

// ─── State ─────────────────────────────────────────────────────────────────
let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ─── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load stored app URL
  const stored = await chrome.storage.sync.get(['appUrl']);
  if (stored.appUrl) appUrl = stored.appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  renderPageCard(tab);
  bindActions();
});

// ─── Render page card ────────────────────────────────────────────────────────
function renderPageCard(tab) {
  const titleEl = document.getElementById('pageTitle');
  const urlEl = document.getElementById('pageUrl');
  const badgeEl = document.getElementById('platformBadge');
  const faviconEl = document.getElementById('pageFavicon');
  const placeholderEl = document.getElementById('faviconPlaceholder');

  const url = tab?.url || '';
  const title = tab?.title || url;

  titleEl.textContent = truncate(title, 72);
  urlEl.textContent = truncate(url.replace(/^https?:\/\//, ''), 55);

  const platform = detectPlatform(url);
  if (platform && platform !== 'other') {
    badgeEl.textContent = PLATFORM_LABELS[platform] || platform;
    badgeEl.className = `platform-badge ${platform}`;
    badgeEl.style.display = '';
  }

  // Favicon
  if (tab?.favIconUrl) {
    faviconEl.onload = () => {
      faviconEl.classList.add('loaded');
      placeholderEl.classList.add('hidden');
    };
    faviconEl.onerror = () => {};
    faviconEl.src = tab.favIconUrl;
  }
}

// ─── Bind UI ─────────────────────────────────────────────────────────────────
function bindActions() {
  document.getElementById('clipBtn').addEventListener('click', handleClip);
  document.getElementById('openBtn').addEventListener('click', handleOpenApp);
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('closeSettings').addEventListener('click', hideSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

// ─── Clip action ──────────────────────────────────────────────────────────────
async function handleClip() {
  if (!currentTab?.url) return;

  const url = currentTab.url;
  const title = currentTab.title || '';

  // Block extension pages and new-tab pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('moz-extension://') || url === 'about:newtab') {
    showError('Cannot clip browser pages. Navigate to a travel site first.');
    return;
  }

  hideEl('errorState');
  hideEl('actionsArea');
  showEl('loadingState');

  try {
    // Open TravelPanel share page in a new tab — the app handles enrichment
    const shareUrl = buildShareUrl(url, title);
    await chrome.tabs.create({ url: shareUrl });

    // Show success briefly before the popup closes
    hideEl('loadingState');
    showEl('successState');

    // Track the save in local storage for rate-limit sync (mirrors app's A4 guard)
    recordClipEvent();

    // Close the popup after a short delay
    setTimeout(() => window.close(), 1800);
  } catch (err) {
    hideEl('loadingState');
    showEl('actionsArea');
    showError('Failed to open TravelPanel. Check your app URL in Settings.');
    console.error('[TravelPanel Clipper]', err);
  }
}

// ─── Open app ─────────────────────────────────────────────────────────────────
function handleOpenApp() {
  chrome.tabs.create({ url: appUrl });
}

// ─── Build share URL ──────────────────────────────────────────────────────────
function buildShareUrl(url, title) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url });
  if (title) params.set('title', title);
  return `${base}/share?${params.toString()}`;
}

// ─── Error helper ─────────────────────────────────────────────────────────────
function showError(msg) {
  document.getElementById('errorText').textContent = msg;
  showEl('errorState');
}

// ─── Settings ──────────────────────────────────────────────────────────────────
function showSettings() {
  document.getElementById('appUrlInput').value = appUrl;
  showEl('settingsPanel');
}

function hideSettings() {
  hideEl('settingsPanel');
  hideEl('settingsSaved');
}

async function saveSettings() {
  const input = document.getElementById('appUrlInput').value.trim();
  if (!input) return;

  // Basic URL validation
  try {
    new URL(input);
  } catch {
    document.getElementById('appUrlInput').focus();
    return;
  }

  appUrl = input.replace(/\/$/, '');
  await chrome.storage.sync.set({ appUrl });

  showEl('settingsSaved');
  setTimeout(() => hideEl('settingsSaved'), 1500);
}

// ─── Rate-limit tracking (mirrors app's A4 guard) ─────────────────────────────
function recordClipEvent() {
  const now = Date.now();
  const hourKey = `clips_${Math.floor(now / 3600000)}`;
  chrome.storage.local.get([hourKey], (res) => {
    const count = (res[hourKey] || 0) + 1;
    chrome.storage.local.set({ [hourKey]: count });
  });
}
