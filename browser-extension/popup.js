// Platform detection — mirrors lib/parse-url.ts
const PLATFORM_PATTERNS = [
  { id: 'instagram',    re: /instagram\.com/i,   label: 'Instagram',    color: '#e1306c' },
  { id: 'youtube',      re: /youtube\.com|youtu\.be/i, label: 'YouTube', color: '#ff0000' },
  { id: 'tiktok',       re: /tiktok\.com/i,      label: 'TikTok',       color: '#010101' },
  { id: 'xiaohongshu',  re: /xiaohongshu\.com|xhslink\.com|xhs\.cn/i, label: '小红书', color: '#ff2442' },
  { id: 'douyin',       re: /douyin\.com/i,       label: 'Douyin',       color: '#161823' },
  { id: 'bilibili',     re: /bilibili\.com/i,     label: 'Bilibili',     color: '#00aeec' },
  { id: 'twitter',      re: /twitter\.com|x\.com/i, label: 'Twitter/X',  color: '#1da1f2' },
  { id: 'pinterest',    re: /pinterest\.com/i,    label: 'Pinterest',    color: '#e60023' },
  { id: 'tripadvisor',  re: /tripadvisor\.com/i,  label: 'TripAdvisor',  color: '#34e0a1' },
  { id: 'googlemaps',   re: /maps\.google\.com|google\.com\/maps/i, label: 'Maps', color: '#4285f4' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.re.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6b7280' };
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const pageInfo     = document.getElementById('page-info');
const noUrl        = document.getElementById('no-url');
const pageTitleEl  = document.getElementById('page-title');
const pageUrlEl    = document.getElementById('page-url');
const chipEl       = document.getElementById('platform-chip');
const clipBtn      = document.getElementById('clip-btn');
const clipBtnText  = document.getElementById('clip-btn-text');
const successEl    = document.getElementById('success-state');
const warningEl    = document.getElementById('app-url-warning');
const settingsBtn  = document.getElementById('settings-btn');
const settingsInlineBtn = document.getElementById('open-settings-inline');

let currentUrl   = '';
let currentTitle = '';

// ── Load current tab info ─────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check for a valid clippable URL
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
    pageInfo.style.display = 'none';
    noUrl.style.display = 'block';
    return;
  }

  currentUrl   = tab.url;
  currentTitle = tab.title || tab.url;

  const platform = detectPlatform(currentUrl);

  // Render platform chip
  chipEl.textContent   = platform.label;
  chipEl.style.backgroundColor = platform.color;
  if (platform.id === 'other') chipEl.classList.add('hidden');

  pageTitleEl.textContent = currentTitle;
  pageUrlEl.textContent   = currentUrl;

  // Check if app URL is configured
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  if (!appUrl) {
    warningEl.style.display = 'flex';
    clipBtn.disabled = false;
    clipBtnText.textContent = 'Clip (configure URL first)';
  } else {
    clipBtn.disabled = false;
    clipBtnText.textContent = 'Clip to TravelPanel';
  }
}

// ── Clip action ───────────────────────────────────────────────────────────────
clipBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });

  const base   = appUrl.replace(/\/$/, '') || 'https://travelpanel.vercel.app';
  const target = `${base}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;

  // Show success then open TravelPanel
  pageInfo.style.display   = 'none';
  warningEl.style.display  = 'none';
  clipBtn.style.display    = 'none';
  successEl.style.display  = 'flex';

  // Small delay so the user sees the success state
  setTimeout(() => {
    chrome.tabs.create({ url: target });
    window.close();
  }, 700);
});

// ── Settings ──────────────────────────────────────────────────────────────────
function openOptions() {
  chrome.runtime.openOptionsPage();
}

settingsBtn.addEventListener('click', openOptions);
settingsInlineBtn.addEventListener('click', openOptions);

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
