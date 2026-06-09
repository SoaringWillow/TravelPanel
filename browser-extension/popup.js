// popup.js — TravelPanel Clipper popup logic

const STORAGE_KEY = 'travelpanel_url';

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORMS = [
  { re: /xiaohongshu\.com|xhslink\.com/,  label: 'Xiaohongshu', color: '#FF2442' },
  { re: /instagram\.com/,                  label: 'Instagram',   color: '#E1306C' },
  { re: /youtube\.com|youtu\.be/,          label: 'YouTube',     color: '#FF0000' },
  { re: /tiktok\.com/,                     label: 'TikTok',      color: '#25F4EE' },
  { re: /douyin\.com/,                     label: 'Douyin',      color: '#FE2C55' },
  { re: /bilibili\.com/,                   label: 'Bilibili',    color: '#FB7299' },
  { re: /twitter\.com|x\.com/,             label: 'X / Twitter', color: '#1DA1F2' },
  { re: /reddit\.com/,                     label: 'Reddit',      color: '#FF4500' },
  { re: /tripadvisor\.com/,                label: 'TripAdvisor', color: '#34E0A1' },
  { re: /lonelyplanet\.com/,               label: 'Lonely Planet', color: '#35A7D0' },
  { re: /airbnb\.com/,                     label: 'Airbnb',      color: '#FF5A5F' },
  { re: /booking\.com/,                    label: 'Booking',     color: '#003580' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.re.test(url)) return p;
  }
  return null;
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const views = {
  setup:   document.getElementById('view-setup'),
  main:    document.getElementById('view-main'),
  success: document.getElementById('view-success'),
};

const $ = (id) => document.getElementById(id);

const errorBanner  = $('errorBanner');
const pageTitle    = $('pageTitle');
const pageMeta     = $('pageMeta');
const extractBar   = $('extractBar');
const statsRow     = $('statsRow');
const tagsRow      = $('tagsRow');
const clipBtn      = $('clipBtn');
const openAppBtn   = $('openAppBtn');
const successDesc  = $('successDesc');
const openAppAgainBtn = $('openAppAgainBtn');
const settingsBtn  = $('settingsBtn');
const openSettingsBtn = $('openSettingsBtn');

// ── State ─────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl     = '';

// ── View switching ────────────────────────────────────────────────────────────

function showView(name) {
  for (const [k, el] of Object.entries(views)) {
    el.classList.toggle('active', k === name);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  appUrl = (stored[STORAGE_KEY] || '').replace(/\/$/, '');

  if (!appUrl) {
    showView('setup');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  showView('main');

  // Populate page info
  pageTitle.textContent = tab.title || 'Untitled page';

  try {
    const url = new URL(tab.url);
    const platform = detectPlatform(tab.url);

    pageMeta.innerHTML = '';

    if (platform) {
      const badge = document.createElement('span');
      badge.className = 'platform-badge';
      badge.style.cssText = `background:${platform.color}22;color:${platform.color}`;
      badge.textContent = platform.label;
      pageMeta.appendChild(badge);
    }

    const host = document.createElement('span');
    host.className = 'page-host';
    host.textContent = url.hostname;
    pageMeta.appendChild(host);
  } catch {
    pageMeta.textContent = '';
  }

  // Kick off background extraction preview (non-blocking)
  extractBar.classList.remove('hidden');
  fetchPreview(tab.url).then(renderPreview).catch(() => {}).finally(() => {
    extractBar.classList.add('hidden');
  });
}

// ── Extraction preview ────────────────────────────────────────────────────────

async function fetchPreview(url) {
  const res = await fetch(`${appUrl}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderPreview(data) {
  const stats = [];

  if (data.locations?.length)
    stats.push(`📍 ${data.locations.length} location${data.locations.length !== 1 ? 's' : ''}`);
  if (data.substance?.length)
    stats.push(`💡 ${data.substance.length} insight${data.substance.length !== 1 ? 's' : ''}`);
  if (data.activities?.length)
    stats.push(`🎯 ${data.activities.length} activit${data.activities.length !== 1 ? 'ies' : 'y'}`);

  if (stats.length) {
    statsRow.innerHTML = stats.map(s => `<div class="stat-chip">${s}</div>`).join('');
    statsRow.classList.remove('hidden');
  }

  const tags = data.tags?.slice(0, 6) ?? [];
  if (tags.length) {
    tagsRow.innerHTML = tags.map(t => `<div class="tag">${t}</div>`).join('');
    tagsRow.classList.remove('hidden');
  }
}

// ── Clip action ───────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentTab?.url || !appUrl) return;

  setClipBtnLoading(true);
  hideError();

  try {
    const shareUrl =
      `${appUrl}/share` +
      `?url=${encodeURIComponent(currentTab.url)}` +
      `&title=${encodeURIComponent(currentTab.title || '')}`;

    await chrome.tabs.create({ url: shareUrl });

    showView('success');
    successDesc.textContent = 'The share page opened — choose a board to save your clip.';
  } catch (err) {
    setClipBtnLoading(false);
    showError(err.message || 'Something went wrong. Check your TravelPanel URL in settings.');
  }
}

function setClipBtnLoading(loading) {
  clipBtn.disabled = loading;
  clipBtn.innerHTML = loading
    ? '<span class="spinner"></span> Saving…'
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Clip this page`;
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}
function hideError() {
  errorBanner.style.display = 'none';
}

// ── Event listeners ───────────────────────────────────────────────────────────

clipBtn.addEventListener('click', handleClip);

openAppBtn.addEventListener('click', () => {
  if (appUrl) chrome.tabs.create({ url: appUrl });
});

openAppAgainBtn.addEventListener('click', () => {
  if (appUrl) chrome.tabs.create({ url: appUrl });
});

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
openSettingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());

// ── Boot ──────────────────────────────────────────────────────────────────────

init().catch(console.error);
