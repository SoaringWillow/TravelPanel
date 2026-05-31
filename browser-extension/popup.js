/* TravelPanel Clipper — popup.js */

const DEFAULT_APP_URL = '';

// Platform detection (mirrors lib/parse-url.ts, extended for more platforms)
const PLATFORMS = [
  { key: 'youtube',      pattern: /youtube\.com|youtu\.be/,              label: 'YouTube',       color: '#FF0000', icon: '▶️' },
  { key: 'instagram',    pattern: /instagram\.com/,                       label: 'Instagram',     color: '#E1306C', icon: '📸' },
  { key: 'tiktok',       pattern: /tiktok\.com/,                          label: 'TikTok',        color: '#010101', icon: '🎵' },
  { key: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com|xhs\.link/, label: '小红书',    color: '#FF2442', icon: '📕' },
  { key: 'douyin',       pattern: /douyin\.com|iesdouyin\.com/,           label: 'Douyin',        color: '#161823', icon: '🎬' },
  { key: 'wechat',       pattern: /weixin\.qq\.com|mp\.weixin/,           label: 'WeChat',        color: '#07C160', icon: '💬' },
  { key: 'bilibili',     pattern: /bilibili\.com|b23\.tv/,                label: 'Bilibili',      color: '#00AEEC', icon: '📺' },
  { key: 'twitter',      pattern: /twitter\.com|x\.com/,                  label: 'X / Twitter',   color: '#000000', icon: '🐦' },
  { key: 'facebook',     pattern: /facebook\.com|fb\.watch/,              label: 'Facebook',      color: '#1877F2', icon: '👥' },
  { key: 'pinterest',    pattern: /pinterest\.com/,                       label: 'Pinterest',     color: '#E60023', icon: '📌' },
];

const WEB_PLATFORM = { key: 'other', label: 'Web', color: '#6366F1', icon: '🌐' };

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return WEB_PLATFORM;
}

// Storage helpers
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['appUrl'], (r) => resolve({ appUrl: r.appUrl || DEFAULT_APP_URL }));
  });
}

function openSettings() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  }
  window.close();
}

// ── Main ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl    = document.getElementById('loading-state');
  const mainEl       = document.getElementById('main-content');
  const errorEl      = document.getElementById('error-notice');
  const setupEl      = document.getElementById('setup-notice');
  const faviconImg   = document.getElementById('page-favicon');
  const faviconPh    = document.getElementById('favicon-placeholder');
  const platformChip = document.getElementById('platform-chip');
  const titleEl      = document.getElementById('page-title');
  const urlEl        = document.getElementById('page-url');
  const clipBtn      = document.getElementById('clip-btn');
  const openAppBtn   = document.getElementById('open-app-btn');

  // Settings / setup-link
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('setup-link').addEventListener('click', openSettings);

  // Load current tab
  let tab;
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = t;
  } catch {
    showError('Could not access the current tab.');
    return;
  }

  const settings = await getSettings();
  const appUrl = settings.appUrl ? settings.appUrl.replace(/\/$/, '') : '';

  // Show setup notice if URL not configured
  if (!appUrl) {
    setupEl.classList.add('visible');
    clipBtn && (clipBtn.disabled = true);
  }

  // Reveal main content, hide loading
  loadingEl.classList.add('hidden');
  mainEl.classList.remove('hidden');

  // Populate page info
  const currentUrl = tab?.url || '';
  const currentTitle = tab?.title || 'Untitled';
  const platform = detectPlatform(currentUrl);

  platformChip.textContent = platform.label;
  platformChip.style.backgroundColor = platform.color;
  titleEl.textContent = currentTitle;
  urlEl.textContent = currentUrl;

  // Favicon
  if (tab?.favIconUrl) {
    faviconImg.src = tab.favIconUrl;
    faviconImg.style.display = 'block';
    faviconImg.onload = () => { faviconPh.style.display = 'none'; };
    faviconImg.onerror = () => {
      faviconImg.style.display = 'none';
      faviconPh.textContent = platform.icon;
    };
  } else {
    faviconPh.textContent = platform.icon;
  }

  // Open app link
  openAppBtn.addEventListener('click', () => {
    if (appUrl) {
      chrome.tabs.create({ url: appUrl });
    } else {
      openSettings();
    }
    window.close();
  });

  // Clip button
  clipBtn.addEventListener('click', () => {
    if (!appUrl) {
      openSettings();
      return;
    }

    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}&from_extension=true`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  function showError(msg) {
    loadingEl.classList.add('hidden');
    mainEl.classList.remove('hidden');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    if (clipBtn) clipBtn.disabled = true;
  }
});
