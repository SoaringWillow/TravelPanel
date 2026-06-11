// Platform detection — mirrors lib/parse-url.ts
const PLATFORM_PATTERNS = [
  { key: 'instagram',      re: /instagram\.com/i,                   label: 'Instagram',      color: '#E1306C' },
  { key: 'youtube',        re: /(?:youtube\.com|youtu\.be)/i,        label: 'YouTube',        color: '#FF0000' },
  { key: 'xiaohongshu',    re: /xiaohongshu\.com|xhslink\.com/i,     label: 'Xiaohongshu',    color: '#FF2442' },
  { key: 'tiktok',         re: /tiktok\.com/i,                      label: 'TikTok',         color: '#010101' },
  { key: 'twitter',        re: /(?:twitter|x)\.com/i,               label: 'X / Twitter',    color: '#1DA1F2' },
  { key: 'tripadvisor',    re: /tripadvisor\./i,                     label: 'TripAdvisor',    color: '#34E0A1' },
  { key: 'airbnb',         re: /airbnb\./i,                          label: 'Airbnb',         color: '#FF5A5F' },
  { key: 'maps',           re: /(?:maps\.google|goo\.gl\/maps)/i,    label: 'Google Maps',    color: '#4285F4' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.re.test(url)) return p;
  }
  return { key: 'web', label: 'Web', color: '#6B7280' };
}

// ── State ────────────────────────────────────────────────────────────────────

let appUrl = '';
let currentTabUrl = '';
let currentTabTitle = '';

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved TravelPanel URL from storage
  const stored = await chrome.storage.local.get('travelPanelUrl');
  appUrl = (stored.travelPanelUrl || '').trim().replace(/\/$/, '');

  if (!appUrl) {
    showNotConfigured();
    return;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl = tab?.url || '';
  currentTabTitle = tab?.title || 'Untitled page';

  // Render preview
  renderPreview();

  // Wire open-app link
  const openLink = document.getElementById('open-app-link');
  if (openLink) openLink.href = appUrl;

  // Wire success view link
  const successLink = document.getElementById('success-view-link');
  if (successLink) successLink.href = appUrl;
}

function showNotConfigured() {
  document.getElementById('not-configured').style.display = 'block';
  document.getElementById('main-ui').style.display = 'none';
}

function renderPreview() {
  const platform = detectPlatform(currentTabUrl);

  const chip = document.getElementById('platform-chip');
  chip.textContent = platform.label;
  chip.style.background = platform.color;

  const titleEl = document.getElementById('page-title');
  titleEl.textContent = currentTabTitle || 'Untitled page';

  const urlEl = document.getElementById('page-url');
  try {
    const u = new URL(currentTabUrl);
    urlEl.textContent = u.hostname + u.pathname.slice(0, 40);
  } catch {
    urlEl.textContent = currentTabUrl.slice(0, 60);
  }

  // Disable save on internal browser pages
  const saveBtn = document.getElementById('save-btn');
  const isSaveable = currentTabUrl && !currentTabUrl.startsWith('chrome://') && !currentTabUrl.startsWith('about:') && !currentTabUrl.startsWith('edge://') && !currentTabUrl.startsWith('moz-extension://');
  if (!isSaveable) {
    saveBtn.disabled = true;
    titleEl.textContent = 'Navigate to a travel page to save it';
  }
}

// ── Save handler ─────────────────────────────────────────────────────────────

function handleSave() {
  if (!appUrl || !currentTabUrl) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(currentTabUrl)}&title=${encodeURIComponent(currentTabTitle)}`;

  // Open the TravelPanel share page in a new tab
  chrome.tabs.create({ url: shareUrl });

  // Show success state in popup
  const mainUi = document.getElementById('main-ui');
  const successState = document.getElementById('success-state');
  const successSub = document.getElementById('success-sub');

  mainUi.style.display = 'none';
  successState.style.display = 'flex';
  successSub.textContent = 'The save dialog has opened in a new tab.';

  // Auto-close popup after a short delay
  setTimeout(() => window.close(), 1800);
}

// ── Event bindings ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('save-btn')?.addEventListener('click', handleSave);

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('setup-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
