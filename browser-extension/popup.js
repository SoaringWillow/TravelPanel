'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORMS = [
  { id: 'instagram',    pattern: /instagram\.com/,               label: 'Instagram',   color: '#e1306c' },
  { id: 'youtube',      pattern: /youtube\.com|youtu\.be/,       label: 'YouTube',     color: '#ff0000' },
  { id: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com/, label: '小红书',      color: '#ff2442' },
  { id: 'tiktok',       pattern: /tiktok\.com/,                   label: 'TikTok',      color: '#010101' },
  { id: 'twitter',      pattern: /twitter\.com|x\.com/,           label: 'X / Twitter', color: '#000000' },
  { id: 'pinterest',    pattern: /pinterest\.com/,                label: 'Pinterest',   color: '#e60023' },
  { id: 'tripadvisor',  pattern: /tripadvisor\./,                 label: 'TripAdvisor', color: '#34e0a1' },
  { id: 'airbnb',       pattern: /airbnb\./,                      label: 'Airbnb',      color: '#ff5a5f' },
];

const TRAVEL_DOMAINS = [
  /instagram\.com/, /youtube\.com/, /youtu\.be/, /xiaohongshu\.com/, /xhslink\.com/,
  /tiktok\.com/, /pinterest\.com/, /tripadvisor\./, /airbnb\./, /booking\.com/,
  /expedia\./, /viator\.com/, /lonelyplanet\.com/, /cntraveler\.com/, /travel/,
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6b7280' };
}

function isTravelPage(url) {
  return TRAVEL_DOMAINS.some((re) => re.test(url));
}

// ── Storage helpers ─────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://your-app.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || '');
    });
  });
}

// ── Show/hide helpers ───────────────────────────────────────────────────────

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── Main ────────────────────────────────────────────────────────────────────

async function init() {
  // Wire up always-visible buttons first
  document.getElementById('settingsBtn').addEventListener('click', openOptions);
  document.getElementById('openOptionsFromSetup').addEventListener('click', openOptions);
  document.getElementById('openAppBtn').addEventListener('click', openApp);

  // Check if app URL is configured
  const appUrl = await getAppUrl();
  if (!appUrl) {
    hide('loadingState');
    show('setupState');
    return;
  }

  // Get current tab
  let tab;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  } catch {
    hide('loadingState');
    show('errorState');
    return;
  }

  const url = tab?.url ?? '';
  const title = tab?.title ?? '';

  // Reject non-http pages (chrome://, about:, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    hide('loadingState');
    show('errorState');
    return;
  }

  // Render the URL card
  const platform = detectPlatform(url);
  const chip = document.getElementById('platformChip');
  chip.textContent = platform.label;
  chip.style.backgroundColor = platform.color;

  document.getElementById('pageTitle').textContent = title || 'Untitled page';

  const urlDisplay = document.getElementById('pageUrl');
  try {
    const parsed = new URL(url);
    urlDisplay.textContent = parsed.hostname + parsed.pathname.slice(0, 40);
  } catch {
    urlDisplay.textContent = url.slice(0, 60);
  }

  // Non-travel page notice
  if (!isTravelPage(url)) {
    show('nonTravelNotice');
  }

  // Wire up clip button
  document.getElementById('clipBtn').addEventListener('click', () => {
    clip(url, title, appUrl);
  });

  hide('loadingState');
  show('mainState');
}

function clip(url, title, appUrl) {
  const btn = document.getElementById('clipBtn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.6s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Opening…
  `;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });

  // Brief pause so the user sees feedback before the popup closes
  setTimeout(() => window.close(), 400);
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

async function openApp() {
  const appUrl = await getAppUrl();
  if (appUrl) {
    chrome.tabs.create({ url: appUrl });
  } else {
    chrome.runtime.openOptionsPage();
  }
}

// Boot
init().catch(console.error);
