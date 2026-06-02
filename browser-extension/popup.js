// TravelPanel Clipper — popup logic

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_PATTERNS = [
  { pattern: /instagram\.com/i,      label: 'Instagram',    color: '#E1306C' },
  { pattern: /youtube\.com|youtu\.be/i, label: 'YouTube',   color: '#FF0000' },
  { pattern: /tiktok\.com/i,          label: 'TikTok',      color: '#010101' },
  { pattern: /xiaohongshu\.com|xhslink\.com|rednote/i, label: 'Rednote', color: '#FF2442' },
  { pattern: /twitter\.com|x\.com/i,  label: 'X / Twitter', color: '#1DA1F2' },
  { pattern: /pinterest\.com/i,       label: 'Pinterest',   color: '#E60023' },
  { pattern: /tripadvisor\.com/i,     label: 'TripAdvisor', color: '#34E0A1' },
  { pattern: /booking\.com/i,         label: 'Booking.com', color: '#003580' },
  { pattern: /airbnb\.com/i,          label: 'Airbnb',      color: '#FF5A5F' },
  { pattern: /maps\.google|google\.com\/maps/i, label: 'Google Maps', color: '#4285F4' },
];

const NON_TRAVEL_PATTERNS = [
  /github\.com/, /stackoverflow\.com/, /mail\.google\.com/,
  /docs\.google\.com/, /notion\.so/, /linear\.app/, /figma\.com/,
  /localhost/, /127\.0\.0\.1/,
];

function detectPlatform(url) {
  for (const { pattern, label, color } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { label, color };
  }
  return null;
}

function isLikelyNonTravel(url) {
  return NON_TRAVEL_PATTERNS.some(p => p.test(url));
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const pageTitleEl   = $('pageTitle');
const pageUrlEl     = $('pageUrl');
const faviconWrap   = $('faviconWrap');
const platformChip  = $('platformChip');
const saveBtnEl     = $('saveBtn');
const saveBtnText   = $('saveBtnText');
const openAppBtn    = $('openAppBtn');
const mainContent   = $('mainContent');
const savingState   = $('savingState');
const doneState     = $('doneState');
const settingsBtn   = $('settingsBtn');
const settingsLink  = $('settingsLink');
const nonTravelHint = $('nonTravelHint');

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL
  const stored = await chrome.storage.sync.get('appUrl');
  if (stored.appUrl) appUrl = stored.appUrl.replace(/\/$/, '');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    renderNoPage();
    return;
  }

  renderPage(tab);
}

function renderNoPage() {
  pageTitleEl.classList.remove('skeleton', 'skeleton-title');
  pageUrlEl.classList.remove('skeleton', 'skeleton-url');
  pageTitleEl.textContent = 'Open a travel page first';
  pageUrlEl.textContent = 'Navigate to Instagram, YouTube, TikTok, etc.';
  saveBtnEl.disabled = true;
}

function renderPage(tab) {
  const url   = tab.url;
  const title = tab.title || url;

  // Remove skeleton
  pageTitleEl.classList.remove('skeleton', 'skeleton-title');
  pageUrlEl.classList.remove('skeleton', 'skeleton-url');

  pageTitleEl.textContent = title;

  // Friendly URL display
  try {
    const { hostname, pathname } = new URL(url);
    pageUrlEl.textContent = hostname + (pathname.length > 1 ? pathname.slice(0, 40) + (pathname.length > 40 ? '…' : '') : '');
  } catch {
    pageUrlEl.textContent = url.slice(0, 60) + (url.length > 60 ? '…' : '');
  }

  // Favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
  const img = document.createElement('img');
  img.className = 'favicon';
  img.alt = '';
  img.onload = () => { faviconWrap.innerHTML = ''; faviconWrap.appendChild(img); };
  img.onerror = () => {}; // keep placeholder
  img.src = faviconUrl;

  // Platform chip
  const platform = detectPlatform(url);
  if (platform) {
    platformChip.textContent = platform.label;
    platformChip.style.background = platform.color;
    platformChip.style.display = 'inline-block';
  }

  // Non-travel hint
  if (isLikelyNonTravel(url)) {
    nonTravelHint.classList.add('visible');
  }

  saveBtnEl.disabled = false;
}

// ── Save action ───────────────────────────────────────────────────────────────

saveBtnEl.addEventListener('click', async () => {
  if (!currentTab?.url) return;

  saveBtnEl.disabled = true;
  saveBtnText.textContent = 'Opening…';

  const shareUrl = buildShareUrl(currentTab.url, currentTab.title);

  // Open TravelPanel share page in a new tab
  await chrome.tabs.create({ url: shareUrl, active: true });

  mainContent.style.display = 'none';
  doneState.style.display = 'block';

  // Auto-close popup after 1.5s
  setTimeout(() => window.close(), 1500);
});

openAppBtn.addEventListener('click', async () => {
  await chrome.tabs.create({ url: appUrl, active: true });
  window.close();
});

// ── Settings ──────────────────────────────────────────────────────────────────

function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

settingsBtn.addEventListener('click', openSettings);
settingsLink.addEventListener('click', openSettings);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildShareUrl(url, title) {
  const base = `${appUrl}/share`;
  const params = new URLSearchParams({ url });
  if (title) params.set('title', title.slice(0, 200));
  return `${base}?${params.toString()}`;
}

// ── Run ───────────────────────────────────────────────────────────────────────

init().catch(console.error);
