// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', color: '#e1306c' },
  youtube: { label: 'YouTube', color: '#ff0000' },
  xiaohongshu: { label: '小红书', color: '#fe2c55' },
  tiktok: { label: 'TikTok', color: '#010101' },
  twitter: { label: 'Twitter / X', color: '#1da1f2' },
  pinterest: { label: 'Pinterest', color: '#e60023' },
  other: { label: 'Web', color: '#6366f1' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';
  return 'other';
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const clipView = document.getElementById('clip-view');
const successView = document.getElementById('success-view');
const settingsView = document.getElementById('settings-view');

const platformChip = document.getElementById('platform-chip');
const pageTitle = document.getElementById('page-title');
const pageUrl = document.getElementById('page-url');
const clipBtn = document.getElementById('clip-btn');

const settingsBtn = document.getElementById('settings-btn');
const appUrlInput = document.getElementById('app-url-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const settingsStatus = document.getElementById('settings-status');

// ─── State ────────────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';
let appBaseUrl = '';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';
const STORAGE_KEY = 'travelpanel_app_url';

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL from storage
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  appBaseUrl = stored[STORAGE_KEY] || DEFAULT_APP_URL;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    pageTitle.textContent = 'Cannot clip this page';
    pageUrl.textContent = 'Navigate to a travel page to clip it.';
    return;
  }

  currentUrl = tab.url;
  currentTitle = tab.title || '';

  const platform = detectPlatform(currentUrl);
  const config = PLATFORM_CONFIG[platform];

  // Render platform chip
  platformChip.textContent = config.label;
  platformChip.style.backgroundColor = config.color + '20'; // 12% opacity
  platformChip.style.color = config.color;
  platformChip.classList.remove('hidden');

  // Render page info
  pageTitle.textContent = currentTitle || currentUrl;
  pageUrl.textContent = currentUrl;

  // Enable clip button
  clipBtn.disabled = false;
}

// ─── Clip action ──────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  const shareUrl = `${appBaseUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;

  // Show success state immediately
  clipView.classList.add('hidden');
  successView.classList.remove('hidden');

  // Open TravelPanel share page in a new tab
  await chrome.tabs.create({ url: shareUrl });

  // Close popup after a short delay
  setTimeout(() => window.close(), 800);
});

// ─── Settings ─────────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  clipView.classList.add('hidden');
  successView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  appUrlInput.value = appBaseUrl;
  settingsStatus.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', async () => {
  const val = appUrlInput.value.trim().replace(/\/$/, '');
  if (!val) return;

  try {
    new URL(val); // validate
  } catch {
    appUrlInput.style.borderColor = '#ef4444';
    return;
  }

  appUrlInput.style.borderColor = '';
  appBaseUrl = val;
  await chrome.storage.sync.set({ [STORAGE_KEY]: val });

  settingsStatus.textContent = '✓ Saved!';
  settingsStatus.classList.remove('hidden');
  setTimeout(() => {
    settingsView.classList.add('hidden');
    clipView.classList.remove('hidden');
    settingsStatus.classList.add('hidden');
  }, 1000);
});

cancelSettingsBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  clipView.classList.remove('hidden');
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
