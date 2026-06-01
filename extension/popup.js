/* TravelPanel Browser Extension — popup.js */

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = {
  instagram:    { label: 'Instagram',     color: '#e1306c', emoji: '📸' },
  youtube:      { label: 'YouTube',       color: '#ff0000', emoji: '▶️' },
  xiaohongshu:  { label: 'Xiaohongshu',  color: '#ff2442', emoji: '📕' },
  tiktok:       { label: 'TikTok',        color: '#010101', emoji: '🎵' },
  twitter:      { label: 'Twitter / X',   color: '#1da1f2', emoji: '🐦' },
  tripadvisor:  { label: 'TripAdvisor',   color: '#34e0a1', emoji: '🦉' },
  airbnb:       { label: 'Airbnb',        color: '#ff5a5f', emoji: '🏠' },
  googlemaps:   { label: 'Google Maps',   color: '#4285f4', emoji: '🗺️' },
  other:        { label: 'Web',           color: '#6366f1', emoji: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('instagram.com'))                       return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('tiktok.com'))                          return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('tripadvisor.'))                        return 'tripadvisor';
  if (url.includes('airbnb.'))                             return 'airbnb';
  if (url.includes('google.com/maps') || url.includes('maps.google')) return 'googlemaps';
  return 'other';
}

function isClippableUrl(url) {
  if (!url) return false;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false;
  if (url.startsWith('about:') || url.startsWith('moz-extension://')) return false;
  if (url.startsWith('edge://') || url.startsWith('brave://')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function getStoredAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

function setStoredAppUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ appUrl: url }, resolve);
  });
}

// ── DOM references ──────────────────────────────────────────────────────────

const previewSection  = document.getElementById('previewSection');
const noUrlSection    = document.getElementById('noUrlSection');
const platformChip    = document.getElementById('platformChip');
const pageTitle       = document.getElementById('pageTitle');
const pageUrl         = document.getElementById('pageUrl');
const clipBtn         = document.getElementById('clipBtn');
const openAppBtn      = document.getElementById('openAppBtn');
const settingsToggle  = document.getElementById('settingsToggle');
const settingsPanel   = document.getElementById('settingsPanel');
const appUrlInput     = document.getElementById('appUrlInput');
const saveUrlBtn      = document.getElementById('saveUrlBtn');
const toast           = document.getElementById('toast');

// ── State ───────────────────────────────────────────────────────────────────

let currentUrl   = '';
let currentTitle = '';
let appUrl       = DEFAULT_APP_URL;

// ── Init ────────────────────────────────────────────────────────────────────

async function init() {
  appUrl = await getStoredAppUrl();
  appUrlInput.value = appUrl !== DEFAULT_APP_URL ? appUrl : '';

  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !isClippableUrl(tab.url)) {
    previewSection.style.display = 'none';
    noUrlSection.style.display   = 'block';
    clipBtn.disabled = true;
    return;
  }

  currentUrl   = tab.url;
  currentTitle = tab.title || tab.url;

  const platform = detectPlatform(currentUrl);
  const meta     = PLATFORMS[platform] || PLATFORMS.other;

  // Populate preview card
  platformChip.textContent        = `${meta.emoji} ${meta.label}`;
  platformChip.style.background   = meta.color;
  pageTitle.textContent           = currentTitle;
  pageUrl.textContent             = currentUrl;
}

// ── Clip handler ─────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  const base   = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  const target = `${base}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;

  clipBtn.disabled = true;
  toast.classList.add('visible');

  await chrome.tabs.create({ url: target });
  setTimeout(() => window.close(), 600);
});

// ── Open app handler ─────────────────────────────────────────────────────────

openAppBtn.addEventListener('click', async () => {
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  await chrome.tabs.create({ url: base });
  window.close();
});

// ── Settings toggle ──────────────────────────────────────────────────────────

settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
  if (settingsPanel.classList.contains('visible')) {
    appUrlInput.focus();
  }
});

// ── Save URL ─────────────────────────────────────────────────────────────────

saveUrlBtn.addEventListener('click', async () => {
  const val = appUrlInput.value.trim();
  if (val && !val.startsWith('http')) {
    appUrlInput.style.borderColor = '#f87171';
    return;
  }
  appUrlInput.style.borderColor = '';
  appUrl = val || DEFAULT_APP_URL;
  await setStoredAppUrl(appUrl);
  saveUrlBtn.textContent = 'Saved ✓';
  setTimeout(() => { saveUrlBtn.textContent = 'Save'; }, 1500);
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveUrlBtn.click();
});

// ── Run ──────────────────────────────────────────────────────────────────────

init();
