'use strict';

const DEFAULT_APP_URL = 'https://your-app.vercel.app';

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  web: null,
};

function detectPlatform(url) {
  if (!url) return 'web';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.cn/i.test(url)) return 'xiaohongshu';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/facebook\.com/i.test(url)) return 'facebook';
  if (/pinterest\.com/i.test(url)) return 'pinterest';
  return 'web';
}

function isClippable(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const mainView      = document.getElementById('mainView');
const successView   = document.getElementById('successView');
const settingsPanel = document.getElementById('settingsPanel');

const pageTitleEl   = document.getElementById('pageTitle');
const pageDomainEl  = document.getElementById('pageDomain');
const faviconEl     = document.getElementById('favicon');
const platformRow   = document.getElementById('platformRow');
const platformBadge = document.getElementById('platformBadge');
const blockedNotice = document.getElementById('blockedNotice');

const clipBtn          = document.getElementById('clipBtn');
const settingsToggle   = document.getElementById('settingsToggle');
const appUrlInput      = document.getElementById('appUrlInput');
const saveSettingsBtn  = document.getElementById('saveSettings');

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL
  const stored = await chrome.storage.sync.get('appUrl');
  appUrl = stored.appUrl || DEFAULT_APP_URL;
  appUrlInput.value = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !isClippable(tab.url)) {
    pageTitleEl.textContent = 'No clippable page';
    blockedNotice.style.display = 'block';
    return;
  }

  const title  = tab.title || getDomain(tab.url);
  const domain = getDomain(tab.url);
  const platform = detectPlatform(tab.url);

  pageTitleEl.textContent = title;
  pageDomainEl.textContent = domain;

  // Show favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const img = document.createElement('img');
  img.src = faviconUrl;
  img.width = 20;
  img.height = 20;
  img.onerror = () => {}; // keep the default SVG
  faviconEl.innerHTML = '';
  faviconEl.appendChild(img);

  // Platform badge
  const label = PLATFORM_LABELS[platform];
  if (label) {
    platformBadge.textContent = label;
    platformRow.style.display = 'block';
  }

  clipBtn.disabled = false;
}

// ─── Clip action ──────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', () => {
  if (!currentTab?.url) return;

  const url   = encodeURIComponent(currentTab.url);
  const title = encodeURIComponent(currentTab.title || '');
  const target = `${appUrl}/share?url=${url}&title=${title}`;

  chrome.tabs.create({ url: target });

  // Show success state
  mainView.style.display = 'none';
  successView.style.display = 'block';
  settingsPanel.style.display = 'none';

  // Auto-close after 1.5s
  setTimeout(() => window.close(), 1500);
});

// ─── Settings toggle ──────────────────────────────────────────────────────────

settingsToggle.addEventListener('click', () => {
  const isOpen = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = isOpen ? 'none' : 'block';
});

saveSettingsBtn.addEventListener('click', async () => {
  const val = appUrlInput.value.trim().replace(/\/$/, '');
  if (!val) return;
  appUrl = val;
  await chrome.storage.sync.set({ appUrl: val });
  settingsPanel.style.display = 'none';
  saveSettingsBtn.textContent = 'Saved ✓';
  setTimeout(() => { saveSettingsBtn.textContent = 'Save'; }, 1500);
});

// ─── Start ────────────────────────────────────────────────────────────────────

init();
