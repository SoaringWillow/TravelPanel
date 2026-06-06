// ── Platform detection (mirrors app/lib/parse-url.ts, expanded for browser) ──

const PLATFORMS = [
  { id: 'instagram',    match: /instagram\.com/i,                     label: 'Instagram',       color: '#E1306C' },
  { id: 'youtube',      match: /youtube\.com|youtu\.be/i,             label: 'YouTube',         color: '#FF0000' },
  { id: 'tiktok',       match: /tiktok\.com|douyin\.com|iesdouyin/i,  label: 'TikTok / Douyin', color: '#161823' },
  { id: 'xiaohongshu',  match: /xiaohongshu\.com|xhslink\.com|xhs\.link/i, label: 'Xiaohongshu', color: '#FF2442' },
  { id: 'bilibili',     match: /bilibili\.com|b23\.tv/i,              label: 'Bilibili',        color: '#00AEEC' },
  { id: 'wechat',       match: /weixin\.qq\.com|mp\.weixin/i,         label: 'WeChat',          color: '#07C160' },
  { id: 'twitter',      match: /twitter\.com|x\.com/i,                label: 'X / Twitter',     color: '#1D9BF0' },
  { id: 'pinterest',    match: /pinterest\./i,                         label: 'Pinterest',       color: '#E60023' },
  { id: 'tripadvisor',  match: /tripadvisor\./i,                       label: 'TripAdvisor',     color: '#00AA6C' },
  { id: 'booking',      match: /booking\.com/i,                        label: 'Booking.com',     color: '#003580' },
  { id: 'airbnb',       match: /airbnb\./i,                            label: 'Airbnb',          color: '#FF5A5F' },
  { id: 'reddit',       match: /reddit\.com/i,                         label: 'Reddit',          color: '#FF4500' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.match.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6366F1' };
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const setupSection   = document.getElementById('setup-section');
const clipSection    = document.getElementById('clip-section');
const successSection = document.getElementById('success-section');

const platformBadge  = document.getElementById('platform-badge');
const pageTitle      = document.getElementById('page-title');
const pageUrl        = document.getElementById('page-url');
const clipBtn        = document.getElementById('clip-btn');
const openAppBtn     = document.getElementById('open-app-btn');
const configureBtn   = document.getElementById('configure-btn');
const settingsBtn    = document.getElementById('settings-btn');
const footerSettings = document.getElementById('footer-settings');

// ── State ─────────────────────────────────────────────────────────────────────

let currentUrl   = '';
let currentTitle = '';
let appUrl       = '';

// ── Init ──────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(['appUrl'], (result) => {
  appUrl = (result.appUrl || '').replace(/\/$/, '');

  if (!appUrl) {
    show(setupSection);
    return;
  }

  // Load current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    currentUrl   = tab.url   || '';
    currentTitle = tab.title || '';

    const platform = detectPlatform(currentUrl);
    platformBadge.textContent       = platform.label;
    platformBadge.style.background  = platform.color;
    pageTitle.textContent           = currentTitle || '(no title)';
    pageUrl.textContent             = formatUrl(currentUrl);

    show(clipSection);
  });
});

// ── Actions ───────────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', () => {
  if (!appUrl || !currentUrl) return;

  clipBtn.disabled = true;
  clipBtn.textContent = 'Opening…';

  const shareUrl = buildShareUrl(appUrl, currentUrl, currentTitle);
  chrome.tabs.create({ url: shareUrl });

  show(successSection);
  setTimeout(() => window.close(), 1200);
});

openAppBtn.addEventListener('click', () => {
  if (!appUrl) return;
  chrome.tabs.create({ url: appUrl });
  window.close();
});

configureBtn.addEventListener('click', openOptions);
settingsBtn.addEventListener('click', openOptions);
footerSettings.addEventListener('click', openOptions);

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(el) {
  [setupSection, clipSection, successSection].forEach((s) => s.classList.add('hidden'));
  el.classList.remove('hidden');
}

function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

function buildShareUrl(base, url, title) {
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    // Show hostname + up to 40 chars of path
    const path = u.pathname.length > 40 ? u.pathname.slice(0, 40) + '…' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.slice(0, 60);
  }
}
