'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

const PLATFORM_MAP = [
  [/youtube\.com|youtu\.be/, 'YouTube'],
  [/instagram\.com/, 'Instagram'],
  [/xiaohongshu\.com|xhslink\.com/, 'Xiaohongshu'],
  [/tiktok\.com/, 'TikTok'],
  [/twitter\.com|x\.com/, 'X / Twitter'],
  [/maps\.google\.com|google\.com\/maps/, 'Google Maps'],
  [/tripadvisor\.com/, 'TripAdvisor'],
];

function detectPlatform(url) {
  for (const [pattern, label] of PLATFORM_MAP) {
    if (pattern.test(url)) return label;
  }
  return null;
}

let currentTab = null;
let travelpanelUrl = DEFAULT_URL;

// ── DOM helpers ─────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showError(msg) {
  const el = $('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function showSuccess(boardName) {
  $('mainView').style.display = 'none';
  $('successView').style.display = 'flex';
  $('successSubtitle').textContent = `Saved to ${boardName}`;
  setTimeout(() => window.close(), 2500);
}

function setLoading(loading) {
  const btn = $('clipInboxBtn');
  const label = $('clipBtnLabel');
  btn.disabled = loading;
  $('chooseBoardBtn').disabled = loading;
  label.textContent = loading ? 'Clipping…' : 'Clip to Inbox';
}

// ── Initialise ───────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL });
  travelpanelUrl = stored.travelpanelUrl;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.url) {
    showError('Cannot clip this page.');
    setLoading(true); // disable buttons
    return;
  }

  // Page title
  $('pageTitle').textContent = tab.title || tab.url;

  // Domain
  try {
    const u = new URL(tab.url);
    $('pageDomain').textContent = u.hostname.replace(/^www\./, '');
  } catch {
    $('pageDomain').textContent = '';
  }

  // Block non-HTTP pages (new tab, chrome://, etc.)
  if (!tab.url.startsWith('http')) {
    showError('Only regular web pages can be clipped.');
    setLoading(true);
    return;
  }

  // Favicon
  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.onerror = () => { /* keep fallback emoji */ };
    $('faviconWrap').innerHTML = '';
    $('faviconWrap').appendChild(img);
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform) {
    $('platformBadge').textContent = platform;
    $('platformRow').style.display = 'block';
  }
}

// ── Clip to Inbox ────────────────────────────────────────────────────────────

$('clipInboxBtn').addEventListener('click', async () => {
  if (!currentTab?.url) return;
  setLoading(true);

  try {
    const shareUrl = new URL(`${travelpanelUrl}/share`);
    shareUrl.searchParams.set('url', currentTab.url);
    shareUrl.searchParams.set('title', currentTab.title ?? '');
    shareUrl.searchParams.set('autoSave', 'true');
    shareUrl.searchParams.set('source', 'extension');

    await chrome.tabs.create({ url: shareUrl.toString() });
    showSuccess('Inbox');
  } catch (err) {
    showError('Failed to clip: ' + (err.message ?? String(err)));
    setLoading(false);
  }
});

// ── Choose board ─────────────────────────────────────────────────────────────

$('chooseBoardBtn').addEventListener('click', async () => {
  if (!currentTab?.url) return;

  try {
    const shareUrl = new URL(`${travelpanelUrl}/share`);
    shareUrl.searchParams.set('url', currentTab.url);
    shareUrl.searchParams.set('title', currentTab.title ?? '');
    shareUrl.searchParams.set('source', 'extension');

    await chrome.tabs.create({ url: shareUrl.toString() });
    window.close();
  } catch (err) {
    showError('Could not open TravelPanel: ' + (err.message ?? String(err)));
  }
});

// ── Open app ─────────────────────────────────────────────────────────────────

$('openAppLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: travelpanelUrl });
});

// ── Settings ──────────────────────────────────────────────────────────────────

$('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init().catch((err) => showError(err.message ?? String(err)));
