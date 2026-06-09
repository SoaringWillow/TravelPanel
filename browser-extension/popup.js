'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_PATTERNS = [
  { id: 'xiaohongshu', pattern: /xiaohongshu\.com|xhslink\.com/i, label: '小红书', color: '#ff2442' },
  { id: 'wechat',      pattern: /mp\.weixin\.qq\.com/i,           label: 'WeChat', color: '#07c160' },
  { id: 'douyin',      pattern: /douyin\.com|vm\.tiktok\.com/i,   label: 'Douyin', color: '#000000' },
  { id: 'bilibili',    pattern: /bilibili\.com/i,                  label: 'Bilibili', color: '#fb7299' },
  { id: 'youtube',     pattern: /youtube\.com|youtu\.be/i,         label: 'YouTube', color: '#ff0000' },
  { id: 'instagram',   pattern: /instagram\.com/i,                 label: 'Instagram', color: '#e1306c' },
  { id: 'tiktok',      pattern: /tiktok\.com/i,                    label: 'TikTok', color: '#010101' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const setupScreen    = $('setupScreen');
const mainScreen     = $('mainScreen');
const errorScreen    = $('errorScreen');
const favicon        = $('favicon');
const platformBadge  = $('platformBadge');
const pageTitle      = $('pageTitle');
const pageUrl        = $('pageUrl');
const clipBtn        = $('clipBtn');
const clipBtnLabel   = $('clipBtnLabel');
const settingsBtn    = $('settingsBtn');

// ── State ─────────────────────────────────────────────────────────────────────

let currentTab  = null;
let tpUrl       = '';  // TravelPanel base URL (e.g. https://app.travelpanel.io)

// ── Helpers ───────────────────────────────────────────────────────────────────

function showScreen(name) {
  setupScreen.hidden  = name !== 'setup';
  mainScreen.hidden   = name !== 'main';
  errorScreen.hidden  = name !== 'error';
}

function setError(msg) {
  $('errorMsg').textContent = msg;
  showScreen('error');
}

function normalizeTpUrl(raw) {
  let u = raw.trim().replace(/\/+$/, '');
  if (u && !u.startsWith('http')) u = 'https://' + u;
  return u;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    // Load stored TravelPanel URL
    const stored = await chrome.storage.sync.get('travelpanelUrl');
    tpUrl = normalizeTpUrl(stored.travelpanelUrl || '');

    if (!tpUrl) {
      showScreen('setup');
      return;
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab?.url) {
      setError('Cannot clip this page (no URL available).');
      return;
    }

    showScreen('main');
    populatePageCard(tab);

  } catch (err) {
    setError('Unexpected error: ' + err.message);
  }
}

function populatePageCard(tab) {
  // Favicon
  if (tab.favIconUrl) {
    favicon.src = tab.favIconUrl;
    favicon.hidden = false;
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform) {
    platformBadge.textContent = platform.label;
    platformBadge.style.backgroundColor = platform.color;
    platformBadge.hidden = false;
  }

  // Title (remove skeleton)
  pageTitle.innerHTML = '';
  pageTitle.textContent = tab.title || tab.url;

  // URL (truncated)
  try {
    const u = new URL(tab.url);
    pageUrl.textContent = u.hostname + u.pathname.slice(0, 60) + (u.pathname.length > 60 ? '…' : '');
  } catch {
    pageUrl.textContent = tab.url.slice(0, 80);
  }
}

// ── Clip handler ──────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentTab?.url) return;

  clipBtn.disabled = true;
  clipBtnLabel.textContent = 'Opening TravelPanel…';
  clipBtn.classList.add('opening');

  const shareUrl = tpUrl + '/share'
    + '?url='   + encodeURIComponent(currentTab.url)
    + '&title=' + encodeURIComponent(currentTab.title || '');

  await chrome.tabs.create({ url: shareUrl });

  // Show brief success then close
  setTimeout(() => window.close(), 600);
}

// ── Event listeners ───────────────────────────────────────────────────────────

clipBtn.addEventListener('click', handleClip);

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

$('openSettingsFromSetup').addEventListener('click', () => chrome.runtime.openOptionsPage());

// Re-run init when options are saved (storage change while popup is open)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.travelpanelUrl) {
    tpUrl = normalizeTpUrl(changes.travelpanelUrl.newValue || '');
    if (tpUrl && mainScreen.hidden) init();
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
