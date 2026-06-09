// Platform detection map
const PLATFORMS = {
  'youtube.com':       { label: 'YouTube',    cls: 'badge-youtube' },
  'youtu.be':         { label: 'YouTube',    cls: 'badge-youtube' },
  'instagram.com':    { label: 'Instagram',  cls: 'badge-instagram' },
  'xiaohongshu.com':  { label: '小红书',      cls: 'badge-xhs' },
  'xhslink.com':      { label: '小红书',      cls: 'badge-xhs' },
  'douyin.com':       { label: 'Douyin',     cls: 'badge-douyin' },
  'bilibili.com':     { label: 'Bilibili',   cls: 'badge-bilibili' },
  'b23.tv':           { label: 'Bilibili',   cls: 'badge-bilibili' },
  'tiktok.com':       { label: 'TikTok',     cls: 'badge-tiktok' },
  'tripadvisor.com':  { label: 'TripAdvisor',cls: 'badge-travel' },
  'airbnb.com':       { label: 'Airbnb',     cls: 'badge-travel' },
  'lonelyplanet.com': { label: 'Lonely Planet', cls: 'badge-travel' },
  'viator.com':       { label: 'Viator',     cls: 'badge-travel' },
  'booking.com':      { label: 'Booking.com',cls: 'badge-travel' },
  'expedia.com':      { label: 'Expedia',    cls: 'badge-travel' },
  'maps.google.com':  { label: 'Google Maps',cls: 'badge-travel' },
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (host === domain || host.endsWith('.' + domain)) return info;
    }
  } catch (_) {}
  return null;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── State ────────────────────────────────────────────────
let currentTab = null;
let appUrl = 'https://travelpanel.app';

// ── Boot ─────────────────────────────────────────────────
chrome.storage.sync.get({ appUrl: 'https://travelpanel.app' }, ({ appUrl: saved }) => {
  appUrl = saved;
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTab = tab;

  const loadingEl   = document.getElementById('preview-loading');
  const titleEl     = document.getElementById('page-title');
  const hostEl      = document.getElementById('page-host');
  const badgeEl     = document.getElementById('platform-badge');
  const clipBtn     = document.getElementById('clip-btn');

  // Populate preview
  loadingEl.style.display = 'none';

  const title = truncate(tab.title || 'Untitled page', 60);
  titleEl.textContent = title;
  titleEl.style.display = 'block';

  try {
    hostEl.textContent = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch (_) {
    hostEl.textContent = tab.url;
  }
  hostEl.style.display = 'block';

  const platform = detectPlatform(tab.url);
  if (platform) {
    badgeEl.textContent = platform.label;
    badgeEl.className = `platform-badge ${platform.cls}`;
    badgeEl.style.display = 'inline-block';
  }

  // Enable clip button now that we have tab data
  clipBtn.disabled = false;
});

// ── Clip action ──────────────────────────────────────────
document.getElementById('clip-btn').addEventListener('click', () => {
  if (!currentTab) return;

  const clipBtn   = document.getElementById('clip-btn');
  const spinner   = document.getElementById('btn-spinner');
  const btnText   = document.getElementById('btn-text');

  clipBtn.disabled = true;
  spinner.style.display = 'block';
  btnText.textContent = 'Opening…';

  chrome.storage.sync.get({ appUrl: 'https://travelpanel.app' }, ({ appUrl: saved }) => {
    try {
      const base = saved.replace(/\/$/, '');
      const shareUrl = `${base}/share?url=${encodeURIComponent(currentTab.url)}&title=${encodeURIComponent(currentTab.title || '')}`;

      document.getElementById('main-body').style.display = 'none';
      document.getElementById('success-state').style.display = 'block';

      chrome.tabs.create({ url: shareUrl });
      setTimeout(() => window.close(), 1600);
    } catch (err) {
      clipBtn.disabled = false;
      spinner.style.display = 'none';
      btnText.textContent = '✈ Clip this page';
      document.getElementById('error-msg').style.display = 'block';
    }
  });
});

// ── Settings ─────────────────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Open app ─────────────────────────────────────────────
document.getElementById('open-app-btn').addEventListener('click', () => {
  chrome.storage.sync.get({ appUrl: 'https://travelpanel.app' }, ({ appUrl: saved }) => {
    chrome.tabs.create({ url: saved });
    window.close();
  });
});
