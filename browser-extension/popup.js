// TravelPanel Clipper — popup logic

// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORMS = [
  { id: 'xiaohongshu', label: 'Little Red Book', color: '#FF2442', bg: '#FFF0F3',
    test: url => /xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url) },
  { id: 'wechat', label: 'WeChat', color: '#07C160', bg: '#F0FDF4',
    test: url => /weixin\.qq\.com|mp\.weixin/.test(url) },
  { id: 'douyin', label: 'Douyin / TikTok', color: '#161823', bg: '#F3F4F6',
    test: url => /douyin\.com|iesdouyin\.com|tiktok\.com/.test(url) },
  { id: 'bilibili', label: 'Bilibili', color: '#00AEEC', bg: '#F0FAFF',
    test: url => /bilibili\.com|b23\.tv/.test(url) },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', bg: '#FFF5F5',
    test: url => /youtube\.com|youtu\.be/.test(url) },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', bg: '#FFF0F5',
    test: url => /instagram\.com/.test(url) },
  { id: 'tripadvisor', label: 'TripAdvisor', color: '#00AA6C', bg: '#F0FDF7',
    test: url => /tripadvisor\./.test(url) },
  { id: 'google_maps', label: 'Google Maps', color: '#4285F4', bg: '#F0F5FF',
    test: url => /maps\.google\.|google\.[a-z]+\/maps/.test(url) },
];

const TRAVEL_DOMAINS = [
  'xiaohongshu', 'xhslink', 'xhs.link', 'tiktok', 'douyin', 'bilibili', 'b23.tv',
  'instagram', 'youtube', 'youtu.be', 'tripadvisor', 'maps.google', 'booking.com',
  'airbnb', 'expedia', 'lonelyplanet', 'travel', 'hotels', 'hostelworld',
  'weixin.qq.com', 'mp.weixin',
];

function detectPlatform(url) {
  const p = PLATFORMS.find(p => p.test(url));
  return p || { id: 'other', label: 'Web', color: '#6366F1', bg: '#F5F3FF' };
}

function isTravelUrl(url) {
  const lower = url.toLowerCase();
  return TRAVEL_DOMAINS.some(d => lower.includes(d));
}

function faviconUrl(pageUrl) {
  try {
    const host = new URL(pageUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch { return ''; }
}

function trimUrl(url, max = 52) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch { return url.slice(0, max); }
}

// ─── State helpers ────────────────────────────────────────────────────────────

const STATES = ['loading', 'ready', 'success', 'setup', 'not-travel'];

function showState(id) {
  STATES.forEach(s => {
    document.getElementById(`state-${s}`).style.display = s === id ? '' : 'none';
  });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      appUrl: '',
      openInNewTab: true,
      autoClose: true,
      travelCheck: true,
    }, resolve);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = '';
let settings = {};

async function init() {
  showState('loading');

  settings = await getSettings();
  appUrl = settings.appUrl;

  if (!appUrl) {
    showState('setup');
    document.getElementById('btn-open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Update open-app link
  document.getElementById('open-app-link').href = appUrl;
  document.getElementById('open-app-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
  });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    showState('not-travel');
    document.getElementById('btn-clip-anyway').style.display = 'none';
    return;
  }

  const platform = detectPlatform(tab.url);
  const isTravel = isTravelUrl(tab.url) || platform.id !== 'other';

  if (!isTravel && settings.travelCheck) {
    showState('not-travel');
    document.getElementById('btn-clip-anyway').addEventListener('click', () => {
      showReadyState(tab, platform);
    });
    return;
  }

  showReadyState(tab, platform);
}

function showReadyState(tab, platform) {
  showState('ready');

  // Favicon
  const favImg = document.getElementById('favicon-img');
  favImg.src = faviconUrl(tab.url);

  // Title & URL
  document.getElementById('page-title').textContent = tab.title || tab.url;
  document.getElementById('page-url').textContent = trimUrl(tab.url);

  // Platform badge
  const badge = document.getElementById('platform-badge');
  badge.textContent = platform.label;
  badge.style.backgroundColor = platform.bg;
  badge.style.color = platform.color;

  // Save button
  document.getElementById('btn-save').addEventListener('click', () => saveClip(tab, platform));
}

function saveClip(tab, platform) {
  const notes = document.getElementById('notes-input').value.trim();
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  // Build share URL
  const params = new URLSearchParams({ url: tab.url });
  if (tab.title) params.set('title', tab.title);
  if (notes)     params.set('notes', notes);

  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?${params.toString()}`;

  if (settings.openInNewTab) {
    chrome.tabs.create({ url: shareUrl });
  } else {
    chrome.tabs.update(currentTab.id, { url: shareUrl });
  }

  // Show success state
  showState('success');
  const subtitle = document.getElementById('success-subtitle');
  subtitle.textContent = settings.openInNewTab
    ? 'Opening TravelPanel in a new tab…'
    : 'Opening TravelPanel…';

  document.getElementById('success-link').href = shareUrl;
  document.getElementById('success-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: shareUrl });
  });

  if (settings.autoClose) {
    setTimeout(() => window.close(), 1800);
  }
}

// Settings button
document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
