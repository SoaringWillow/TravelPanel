// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_PATTERNS = [
  { key: 'instagram',    re: /instagram\.com/i,                label: 'Instagram',   color: '#E1306C' },
  { key: 'youtube',      re: /youtube\.com|youtu\.be/i,        label: 'YouTube',     color: '#FF0000' },
  { key: 'xiaohongshu',  re: /xiaohongshu\.com|xhslink\.com/i, label: '小红书',        color: '#FF2442' },
  { key: 'tiktok',       re: /tiktok\.com/i,                   label: 'TikTok',      color: '#010101' },
  { key: 'twitter',      re: /twitter\.com|x\.com/i,           label: 'Twitter / X', color: '#1DA1F2' },
  { key: 'pinterest',    re: /pinterest\.com/i,                label: 'Pinterest',   color: '#E60023' },
  { key: 'tripadvisor',  re: /tripadvisor\.com/i,              label: 'TripAdvisor', color: '#34E0A1' },
];

const TRAVEL_DOMAINS = /travel|trip|tour|hotel|airbnb|booking|expedia|hostel|resort|adventure|hike|trek|wander|journey|destination|itinerary|vacation|holiday/i;

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.re.test(url)) return p;
  }
  return null;
}

function looksLikeTravel(url, title) {
  return TRAVEL_DOMAINS.test(url) || TRAVEL_DOMAINS.test(title);
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const mainView      = document.getElementById('main-view');
const successView   = document.getElementById('success-view');
const setupView     = document.getElementById('setup-view');
const faviconEl     = document.getElementById('favicon');
const titleEl       = document.getElementById('page-title');
const urlEl         = document.getElementById('page-url');
const badgeEl       = document.getElementById('platform-badge');
const hintEl        = document.getElementById('not-travel-hint');
const clipOpenBtn   = document.getElementById('clip-open-btn');
const clipInboxBtn  = document.getElementById('clip-inbox-btn');
const settingsBtn   = document.getElementById('settings-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const successDesc   = document.getElementById('success-desc');

let currentUrl   = '';
let currentTitle = '';
let appBaseUrl   = '';

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Load configured base URL from storage
  const stored = await chrome.storage.sync.get('appBaseUrl');
  appBaseUrl = (stored.appBaseUrl || '').replace(/\/$/, '');

  if (!appBaseUrl) {
    showSetup();
    return;
  }

  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentUrl   = tab.url   || '';
  currentTitle = tab.title || '';

  // Populate page card
  titleEl.textContent = currentTitle || 'Untitled page';
  urlEl.textContent   = formatUrl(currentUrl);

  // Favicon
  if (tab.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
  } else {
    faviconEl.style.display = 'none';
  }

  // Platform badge
  const platform = detectPlatform(currentUrl);
  if (platform) {
    badgeEl.textContent       = platform.label;
    badgeEl.style.background  = platform.color;
    badgeEl.style.display     = 'inline-flex';
    hintEl.style.display      = 'none';
  } else if (!looksLikeTravel(currentUrl, currentTitle)) {
    hintEl.style.display = 'flex';
  }

  // Disable clip on non-HTTP pages
  const isClippable = /^https?:\/\//.test(currentUrl);
  clipOpenBtn.disabled  = !isClippable;
  clipInboxBtn.disabled = !isClippable;
  if (!isClippable) {
    clipOpenBtn.style.opacity  = '0.4';
    clipInboxBtn.style.opacity = '0.4';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function buildShareUrl(baseUrl, url, title) {
  return `${baseUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

function showSetup() {
  mainView.style.display    = 'none';
  successView.style.display = 'none';
  setupView.style.display   = 'flex';
}

function showSuccess(title) {
  mainView.style.display    = 'none';
  setupView.style.display   = 'none';
  successView.style.display = 'flex';
  successDesc.textContent   = title || currentTitle || '';
}

// ── Clip actions ──────────────────────────────────────────────────────────────

clipOpenBtn.addEventListener('click', () => {
  const shareUrl = buildShareUrl(appBaseUrl, currentUrl, currentTitle);
  chrome.tabs.create({ url: shareUrl });
  showSuccess(currentTitle);
});

clipInboxBtn.addEventListener('click', () => {
  // Inbox = no boardId, share page handles it
  const shareUrl = buildShareUrl(appBaseUrl, currentUrl, currentTitle);
  chrome.tabs.create({ url: shareUrl });
  showSuccess(currentTitle);
});

// ── Settings navigation ───────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
