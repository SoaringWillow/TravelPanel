'use strict';

const DEFAULT_URL = '';

const PLATFORMS = {
  'instagram.com':    { name: 'Instagram',  badge: 'badge-instagram', emoji: '📸' },
  'youtube.com':      { name: 'YouTube',    badge: 'badge-youtube',   emoji: '▶️' },
  'youtu.be':         { name: 'YouTube',    badge: 'badge-youtube',   emoji: '▶️' },
  'xiaohongshu.com':  { name: '小红书',      badge: 'badge-xhs',       emoji: '📕' },
  'xhslink.com':      { name: '小红书',      badge: 'badge-xhs',       emoji: '📕' },
  'douyin.com':       { name: '抖音',        badge: 'badge-douyin',    emoji: '🎵' },
  'tiktok.com':       { name: 'TikTok',     badge: 'badge-tiktok',    emoji: '🎵' },
  'bilibili.com':     { name: 'Bilibili',   badge: 'badge-bilibili',  emoji: '📺' },
  'twitter.com':      { name: 'X / Twitter',badge: 'badge-twitter',   emoji: '𝕏' },
  'x.com':            { name: 'X / Twitter',badge: 'badge-twitter',   emoji: '𝕏' },
  'reddit.com':       { name: 'Reddit',     badge: 'badge-reddit',    emoji: '🟠' },
  'tripadvisor.com':  { name: 'TripAdvisor',badge: 'badge-web',       emoji: '🌿' },
  'maps.google.com':  { name: 'Google Maps',badge: 'badge-web',       emoji: '🗺️' },
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return info;
    }
  } catch {}
  return { name: 'Web', badge: 'badge-web', emoji: '🌐' };
}

function displayUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const raw = hostname.replace(/^www\./, '') + pathname;
    return raw.length > 46 ? raw.slice(0, 46) + '…' : raw;
  } catch {
    return url.length > 46 ? url.slice(0, 46) + '…' : url;
  }
}

function showState(id) {
  ['loadingState', 'mainState', 'noticeState', 'setupState', 'successState'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

function isClippablePage(url) {
  if (!url) return false;
  const blocked = ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:', 'edge://', 'file://'];
  return !blocked.some(p => url.startsWith(p));
}

async function getTravelPanelUrl() {
  try {
    const data = await chrome.storage.sync.get('travelPanelUrl');
    return (data.travelPanelUrl || '').trim();
  } catch {
    return '';
  }
}

async function init() {
  const tpUrl = await getTravelPanelUrl();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !isClippablePage(tab.url)) {
    showState('noticeState');
    return;
  }

  if (!tpUrl) {
    showState('setupState');
    document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  const platform = detectPlatform(tab.url);
  const title = (tab.title || '').replace(/\s*[-–|].*$/, '').trim() || 'Untitled page';

  const badge = document.getElementById('platformBadge');
  badge.textContent = `${platform.emoji}  ${platform.name}`;
  badge.className = `platform-badge ${platform.badge}`;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = displayUrl(tab.url);

  const hint = document.getElementById('hintText');
  try {
    const host = new URL(tpUrl).hostname;
    hint.textContent = `Opens ${host} in a new tab`;
  } catch {}

  showState('mainState');

  document.getElementById('clipBtn').addEventListener('click', async () => {
    const shareUrl = `${tpUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
    await chrome.tabs.create({ url: shareUrl });
    showState('successState');
    setTimeout(() => window.close(), 1200);
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init().catch(() => showState('noticeState'));
