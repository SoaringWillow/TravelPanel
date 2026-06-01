// ─── Utilities ────────────────────────────────────────────────────────────────

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/instagram\.com/.test(host)) return 'Instagram';
    if (/youtube\.com|youtu\.be/.test(host)) return 'YouTube';
    if (/xiaohongshu\.com|xhslink\.com|red\.com/.test(host)) return 'Xiaohongshu';
    if (/tiktok\.com/.test(host)) return 'TikTok';
    if (/twitter\.com|x\.com/.test(host)) return 'X / Twitter';
    if (/tripadvisor\.com/.test(host)) return 'TripAdvisor';
    if (/airbnb\.com/.test(host)) return 'Airbnb';
    if (/maps\.google\.com|google\.com\/maps/.test(host + url)) return 'Google Maps';
    if (/booking\.com/.test(host)) return 'Booking.com';
    if (/viator\.com/.test(host)) return 'Viator';
    if (/atlasobscura\.com/.test(host)) return 'Atlas Obscura';
  } catch {}
  return null;
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const mainView       = document.getElementById('mainView');
const successView    = document.getElementById('successView');
const settingsView   = document.getElementById('settingsView');

const pageTitle      = document.getElementById('pageTitle');
const pageUrl        = document.getElementById('pageUrl');
const platformBadge  = document.getElementById('platformBadge');
const thumbnail      = document.getElementById('thumbnail');
const thumbnailPlaceholder = document.getElementById('thumbnailPlaceholder');
const descriptionEl  = document.getElementById('description');
const clipBtn        = document.getElementById('clipBtn');
const noUrlWarning   = document.getElementById('noUrlWarning');

const settingsBtn    = document.getElementById('settingsBtn');
const backBtn        = document.getElementById('backBtn');
const appUrlInput    = document.getElementById('appUrlInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveConfirm    = document.getElementById('saveConfirm');

// ─── State ────────────────────────────────────────────────────────────────────

let pageMeta = { title: '', url: '', description: '', image: '' };
let appUrl   = '';

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.sync.get('appUrl');
  appUrl = (stored.appUrl || '').replace(/\/$/, '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Start with tab data immediately so UI doesn't feel slow
  pageMeta.title = tab.title || '';
  pageMeta.url   = tab.url  || '';
  renderPageCard();

  // Try richer OG metadata from content script
  try {
    const meta = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_META' });
    if (meta) {
      pageMeta = { ...pageMeta, ...meta };
      renderPageCard();
    }
  } catch {
    // Content script unavailable on privileged pages (chrome://, about:, etc.)
  }

  updateClipButton();
});

// ─── Render ───────────────────────────────────────────────────────────────────

function renderPageCard() {
  pageTitle.textContent = truncate(pageMeta.title || pageMeta.url, 90) || 'Untitled page';
  pageUrl.textContent   = prettyUrl(pageMeta.url);

  const platform = detectPlatform(pageMeta.url);
  if (platform) {
    platformBadge.textContent = platform;
    platformBadge.style.display = 'inline-flex';
  } else {
    platformBadge.style.display = 'none';
  }

  if (pageMeta.image) {
    thumbnail.src = pageMeta.image;
    thumbnail.style.display = 'block';
    thumbnailPlaceholder.style.display = 'none';
    thumbnail.onerror = () => {
      thumbnail.style.display = 'none';
      thumbnailPlaceholder.style.display = 'flex';
    };
  }

  if (pageMeta.description) {
    descriptionEl.textContent = truncate(pageMeta.description, 160);
    descriptionEl.style.display = 'block';
  }
}

function updateClipButton() {
  if (!appUrl) {
    clipBtn.disabled = true;
    noUrlWarning.style.display = 'flex';
  } else {
    clipBtn.disabled = false;
    noUrlWarning.style.display = 'none';
  }
}

// ─── Clip action ──────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', () => {
  if (!appUrl || !pageMeta.url) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(pageMeta.url)}&title=${encodeURIComponent(pageMeta.title || '')}`;

  // Show success state
  mainView.style.display     = 'none';
  successView.style.display  = 'flex';

  chrome.tabs.create({ url: shareUrl });

  // Close popup after short delay
  setTimeout(() => window.close(), 1200);
});

// ─── Settings ─────────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  mainView.style.display    = 'none';
  settingsView.style.display = 'block';
  appUrlInput.value          = appUrl;
  saveConfirm.style.display  = 'none';
});

backBtn.addEventListener('click', () => {
  settingsView.style.display = 'none';
  mainView.style.display     = 'flex';
});

saveSettingsBtn.addEventListener('click', async () => {
  const val = appUrlInput.value.trim().replace(/\/$/, '');
  if (!val) return;

  try {
    new URL(val); // validate URL format
  } catch {
    appUrlInput.style.borderColor = '#ef4444';
    appUrlInput.focus();
    return;
  }

  appUrlInput.style.borderColor = '';
  appUrl = val;
  await chrome.storage.sync.set({ appUrl: val });

  saveConfirm.style.display = 'flex';
  setTimeout(() => {
    saveConfirm.style.display = 'none';
  }, 2000);

  updateClipButton();
});

// Allow pressing Enter in the URL field to save
appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettingsBtn.click();
});
