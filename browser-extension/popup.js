'use strict';

const DEFAULT_TRAVELPANEL_URL = 'https://travelpanel.vercel.app';

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  xiaohongshu: '#FF2442',
  tiktok: '#010101',
  twitter: '#1DA1F2',
  facebook: '#1877F2',
  pinterest: '#E60023',
  tripadvisor: '#00AF87',
  googlemaps: '#4285F4',
  other: '#6366f1',
};

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  tripadvisor: 'Tripadvisor',
  googlemaps: 'Google Maps',
  other: 'Web',
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('red.com')) return 'xiaohongshu';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('pinterest.com')) return 'pinterest';
  if (u.includes('tripadvisor.com')) return 'tripadvisor';
  if (u.includes('maps.google.com') || u.includes('google.com/maps')) return 'googlemaps';
  return 'other';
}

const TRAVEL_UNSUPPORTED = ['chrome://', 'chrome-extension://', 'about:', 'file://'];
function isLikelyTravelPage(url) {
  return !TRAVEL_UNSUPPORTED.some((p) => url.startsWith(p));
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const setupView = document.getElementById('setup-view');
const clipView = document.getElementById('clip-view');
const successView = document.getElementById('success-view');

const setupUrlInput = document.getElementById('setup-url-input');
const setupSaveBtn = document.getElementById('setup-save-btn');
const setupDefaultLink = document.getElementById('setup-default-link');

const platformChip = document.getElementById('platform-chip');
const titleInput = document.getElementById('title-input');
const urlDisplay = document.getElementById('url-display');
const saveBtn = document.getElementById('save-btn');
const settingsBtn = document.getElementById('settings-btn');
const unsupportedNote = document.getElementById('unsupported-note');

// ─── State ────────────────────────────────────────────────────────────────────
let currentTabUrl = '';
let currentTabTitle = '';
let travelPanelUrl = DEFAULT_TRAVELPANEL_URL;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load stored TravelPanel URL
  const stored = await chrome.storage.sync.get('travelPanelUrl');
  travelPanelUrl = stored.travelPanelUrl || DEFAULT_TRAVELPANEL_URL;

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl = tab?.url || '';
  currentTabTitle = tab?.title || '';

  // First-run check: show setup if URL looks like the default and user hasn't set it
  if (!stored.travelPanelUrl) {
    showSetup();
  } else {
    showClip();
  }
}

// ─── Views ────────────────────────────────────────────────────────────────────
function showSetup() {
  setupView.classList.remove('hidden');
  clipView.classList.add('hidden');
  successView.classList.add('hidden');
  setupUrlInput.value = '';
  setupUrlInput.focus();
}

function showClip() {
  setupView.classList.add('hidden');
  clipView.classList.remove('hidden');
  successView.classList.add('hidden');

  const platform = detectPlatform(currentTabUrl);
  platformChip.textContent = PLATFORM_LABELS[platform];
  platformChip.style.backgroundColor = PLATFORM_COLORS[platform];

  titleInput.value = currentTabTitle || '';
  urlDisplay.textContent = currentTabUrl || '';

  if (!isLikelyTravelPage(currentTabUrl)) {
    saveBtn.disabled = true;
    unsupportedNote.classList.remove('hidden');
  } else {
    saveBtn.disabled = false;
    unsupportedNote.classList.add('hidden');
  }
}

function showSuccess() {
  setupView.classList.add('hidden');
  clipView.classList.add('hidden');
  successView.classList.remove('hidden');
}

// ─── Setup handlers ───────────────────────────────────────────────────────────
setupUrlInput.addEventListener('input', () => {
  const val = setupUrlInput.value.trim();
  const valid = val.startsWith('http://') || val.startsWith('https://');
  setupSaveBtn.disabled = !valid;
});

setupUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !setupSaveBtn.disabled) saveUrl();
});

setupSaveBtn.addEventListener('click', saveUrl);

setupDefaultLink.addEventListener('click', (e) => {
  e.preventDefault();
  setupUrlInput.value = DEFAULT_TRAVELPANEL_URL;
  setupSaveBtn.disabled = false;
  saveUrl();
});

async function saveUrl() {
  const url = setupUrlInput.value.trim().replace(/\/$/, '');
  await chrome.storage.sync.set({ travelPanelUrl: url });
  travelPanelUrl = url;
  showClip();
}

// ─── Clip handler ─────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim() || currentTabTitle;
  const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(currentTabUrl)}&title=${encodeURIComponent(title)}`;
  await chrome.tabs.create({ url: shareUrl, active: true });
  showSuccess();
  // Close popup after short delay
  setTimeout(() => window.close(), 1200);
});

// ─── Settings button ──────────────────────────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Start ────────────────────────────────────────────────────────────────────
init();
