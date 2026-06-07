'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_META = {
  instagram:    { label: 'Instagram',     bg: '#e1306c22', color: '#e1306c', dot: '#e1306c' },
  youtube:      { label: 'YouTube',       bg: '#ff000022', color: '#ff4444', dot: '#ff0000' },
  xiaohongshu:  { label: 'Xiaohongshu',  bg: '#ff285022', color: '#ff2850', dot: '#ff2850' },
  tiktok:       { label: 'TikTok',        bg: '#00f2ea22', color: '#00c8c8', dot: '#00f2ea' },
  twitter:      { label: 'Twitter / X',   bg: '#1d9bf022', color: '#1d9bf0', dot: '#1d9bf0' },
  douyin:       { label: 'Douyin',        bg: '#ff003422', color: '#ff5577', dot: '#fe2c55' },
  bilibili:     { label: 'Bilibili',      bg: '#00a1d622', color: '#00a1d6', dot: '#00a1d6' },
  tripadvisor:  { label: 'TripAdvisor',   bg: '#34e0a122', color: '#34c88a', dot: '#34e0a1' },
  googlemaps:   { label: 'Google Maps',   bg: '#4285f422', color: '#4285f4', dot: '#4285f4' },
  airbnb:       { label: 'Airbnb',        bg: '#ff585822', color: '#ff5858', dot: '#ff385c' },
  other:        { label: 'Web',           bg: '#6366f122', color: '#818cf8', dot: '#6366f1' },
};

function detectPlatform(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('instagram.com'))              return 'instagram';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('xiaohongshu.com') || h.includes('xhslink.com') || h.includes('red.com')) return 'xiaohongshu';
    if (h.includes('tiktok.com'))                 return 'tiktok';
    if (h.includes('twitter.com') || h.includes('x.com')) return 'twitter';
    if (h.includes('douyin.com'))                 return 'douyin';
    if (h.includes('bilibili.com'))               return 'bilibili';
    if (h.includes('tripadvisor.com'))            return 'tripadvisor';
    if (h.includes('google.com/maps') || h.includes('maps.google')) return 'googlemaps';
    if (h.includes('airbnb.com'))                 return 'airbnb';
  } catch (_) { /* ignore */ }
  return 'other';
}

function renderPlatformChip(platform) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.other;
  const chip = document.getElementById('platformChip');
  chip.style.background = meta.bg;
  chip.style.color = meta.color;
  chip.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${meta.dot};display:inline-block;"></span>${meta.label}`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  // Load current tab info
  let tab;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  } catch (e) {
    showError('Could not access the current tab.');
    return;
  }

  const url = tab.url || '';
  const title = tab.title || 'Untitled page';

  // Guard: skip browser internal pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) {
    showError('TravelPanel can only clip web pages, not browser internal pages.');
    document.getElementById('saveBtn').disabled = true;
    return;
  }

  const platform = detectPlatform(url);
  renderPlatformChip(platform);
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = url;

  document.getElementById('saveBtn').addEventListener('click', async () => {
    await openSharePage(url, title);
  });
}

async function openSharePage(url, title) {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Opening…`;

  try {
    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    // Look for an existing TravelPanel tab to reuse
    const appOrigin = new URL(appUrl).origin;
    const existing = await chrome.tabs.query({ url: `${appOrigin}/*` });

    if (existing.length > 0) {
      // Navigate existing tab and focus it
      await chrome.tabs.update(existing[0].id, { url: shareUrl, active: true });
      await chrome.windows.update(existing[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: shareUrl });
    }

    showSuccess();
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg> Save to TravelPanel`;
    showError('Something went wrong. Check your settings.');
  }
}

function showSuccess() {
  document.getElementById('mainView').classList.add('hidden');
  document.getElementById('successView').classList.remove('hidden');
  // Auto-close after 1.8s
  setTimeout(() => window.close(), 1800);
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Settings button → open options page
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
