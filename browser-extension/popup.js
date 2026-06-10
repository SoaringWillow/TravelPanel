/* TravelPanel Clipper — Popup Script */

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORMS = {
  instagram:    { label: 'Instagram',    color: '#e1306c' },
  youtube:      { label: 'YouTube',      color: '#ff0000' },
  xiaohongshu:  { label: '小红书',        color: '#ff2442' },
  tiktok:       { label: 'TikTok',       color: '#010101' },
  twitter:      { label: 'Twitter / X',  color: '#1da1f2' },
  tripadvisor:  { label: 'TripAdvisor',  color: '#34e0a1' },
  googlemaps:   { label: 'Google Maps',  color: '#4285f4' },
  airbnb:       { label: 'Airbnb',       color: '#ff5a5f' },
  booking:      { label: 'Booking.com',  color: '#003580' },
  lonelyplanet: { label: 'Lonely Planet',color: '#ff6600' },
  other:        { label: 'Web',          color: '#6366f1' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('instagram.com'))                         return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('tiktok.com'))                            return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com'))   return 'twitter';
  if (u.includes('tripadvisor.'))                          return 'tripadvisor';
  if (u.includes('maps.google.') || u.includes('goo.gl/maps')) return 'googlemaps';
  if (u.includes('airbnb.'))                               return 'airbnb';
  if (u.includes('booking.com'))                           return 'booking';
  if (u.includes('lonelyplanet.com'))                      return 'lonelyplanet';
  return 'other';
}

// ── Config helpers ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'travelPanelUrl';
// Placeholder — user sets the real URL in options.
// Developers deploying this: replace with your Vercel/production URL.
const DEFAULT_URL = 'https://travelpanel.vercel.app';

function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve((result[STORAGE_KEY] || '').trim() || DEFAULT_URL);
    });
  });
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function setMain(html) {
  document.getElementById('main').innerHTML = html;
}

// ── States ────────────────────────────────────────────────────────────────────

function renderLoading() {
  setMain(`
    <div class="empty-state">
      <div class="spinner" style="border-color:rgba(99,102,241,0.2);border-top-color:#6366f1;margin:12px auto;"></div>
    </div>
  `);
}

function renderEmpty(message) {
  setMain(`
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">Nothing to clip</div>
      <div class="empty-sub">${esc(message)}</div>
    </div>
  `);
}

function renderError(message) {
  const prev = document.getElementById('main').innerHTML;
  setMain(`
    <div class="content">
      <div class="error-banner">${esc(message)}</div>
    </div>
  `);
}

function renderSuccess(title, platform) {
  const config = PLATFORMS[platform] || PLATFORMS.other;
  setMain(`
    <div class="success-state">
      <div class="success-icon">✅</div>
      <div class="success-title">Clipped!</div>
      <div class="success-sub">${esc(title)}</div>
      <div class="success-meta">
        <span class="meta-pill" style="background:${hexToRgba(config.color, 0.12)};color:${config.color}">
          ${esc(config.label)}
        </span>
        <span class="meta-pill">Saved to TravelPanel</span>
      </div>
    </div>
  `);
  // Auto-close after 2.5 s
  setTimeout(() => window.close(), 2500);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Main content render ───────────────────────────────────────────────────────

function renderContent(tab, tpUrl) {
  const { url, title } = tab;
  const platform = detectPlatform(url);
  const config   = PLATFORMS[platform] || PLATFORMS.other;
  const isDefaultUrl = tpUrl === DEFAULT_URL;

  const setupNotice = isDefaultUrl ? `
    <div class="setup-notice">
      ⚙️ First-time setup: <a id="openOptions">enter your TravelPanel URL</a> in settings.
    </div>
  ` : '';

  setMain(`
    <div class="content">
      ${setupNotice}
      <span class="platform-chip" style="background:${config.color}">${esc(config.label)}</span>
      <div class="page-title">${esc(title || 'Untitled page')}</div>
      <div class="page-url">${esc(url)}</div>
      <button class="btn-primary" id="clipBtn">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        Clip to TravelPanel
      </button>
    </div>
  `);

  document.getElementById('clipBtn').addEventListener('click', () => {
    doClip(url, title || '', platform, tpUrl);
  });

  document.getElementById('openOptions')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ── Clip action ───────────────────────────────────────────────────────────────

function doClip(url, title, platform, tpUrl) {
  const clipBtn = document.getElementById('clipBtn');
  if (clipBtn) {
    clipBtn.disabled = true;
    clipBtn.innerHTML = `<div class="spinner"></div> Clipping…`;
  }

  const shareUrl = `${tpUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Open TravelPanel share sheet as a small popup window
  const W = 380, H = 560;
  const left = Math.round((screen.width  - W) / 2);
  const top  = Math.round((screen.height - H) / 2);

  chrome.windows.create(
    { url: shareUrl, type: 'popup', width: W, height: H, left, top },
    (_win) => {
      if (chrome.runtime.lastError) {
        // Fallback: open in a new tab
        chrome.tabs.create({ url: shareUrl });
      }
      renderSuccess(title, platform);
    }
  );
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function init() {
  renderLoading();

  const tpUrl = await getTravelPanelUrl();

  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    renderEmpty('Could not access the current tab.');
    return;
  }

  const tab = tabs[0];
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    renderEmpty('Navigate to a webpage first,\nthen click the extension icon.');
    return;
  }

  renderContent(tab, tpUrl);
}

init();
