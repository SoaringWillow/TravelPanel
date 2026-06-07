'use strict';

const PLATFORMS = [
  { id: 'instagram',    label: 'Instagram',   patterns: [/instagram\.com/, /instagr\.am/] },
  { id: 'youtube',      label: 'YouTube',      patterns: [/youtube\.com/, /youtu\.be/] },
  { id: 'tiktok',       label: 'TikTok',       patterns: [/tiktok\.com/] },
  { id: 'xiaohongshu',  label: '小红书',        patterns: [/xiaohongshu\.com/, /xhslink\.com/, /xhs\.link/] },
  { id: 'douyin',       label: '抖音',          patterns: [/douyin\.com/, /iesdouyin\.com/] },
  { id: 'bilibili',     label: 'Bilibili',     patterns: [/bilibili\.com/, /b23\.tv/] },
  { id: 'twitter',      label: 'X / Twitter',  patterns: [/twitter\.com/, /x\.com/] },
  { id: 'pinterest',    label: 'Pinterest',    patterns: [/pinterest\./] },
  { id: 'facebook',     label: 'Facebook',     patterns: [/facebook\.com/, /fb\.com/] },
  { id: 'weibo',        label: '微博',          patterns: [/weibo\.com/] },
  { id: 'wechat',       label: 'WeChat',       patterns: [/weixin\.qq\.com/, /mp\.weixin/] },
  { id: 'tripadvisor',  label: 'TripAdvisor',  patterns: [/tripadvisor\./] },
  { id: 'googlemaps',   label: 'Google Maps',  patterns: [/maps\.google\./, /goo\.gl\/maps/] },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.patterns.some(re => re.test(url))) return p;
  }
  return null;
}

function shortUrl(url, max = 44) {
  try {
    const { hostname, pathname } = new URL(url);
    const s = hostname.replace(/^www\./, '') + pathname;
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch {
    return url.slice(0, max);
  }
}

function showState(id) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

async function init() {
  const { appUrl } = await chrome.storage.sync.get('appUrl');

  if (!appUrl) {
    showState('state-no-app');
    document.getElementById('btn-go-settings').onclick = () => chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';

  if (!url || /^(chrome|about|edge|moz-extension|chrome-extension):/.test(url)) {
    showState('state-no-url');
    return;
  }

  const title = tab.title || 'Untitled page';
  const platform = detectPlatform(url);

  // Favicon
  const favicon = document.getElementById('page-favicon');
  try {
    favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    favicon.style.display = 'none';
  }
  favicon.onerror = () => { favicon.style.display = 'none'; };

  document.getElementById('page-title').textContent = title;
  document.getElementById('page-url').textContent = shortUrl(url);

  const badge = document.getElementById('page-platform');
  if (platform) {
    badge.textContent = platform.label;
    badge.classList.remove('hidden');
  }

  showState('state-ready');

  const base = appUrl.replace(/\/$/, '');

  document.getElementById('btn-save').onclick = () => {
    chrome.tabs.create({ url: `${base}/?import=${encodeURIComponent(url)}` });
    showState('state-saved');
    setTimeout(() => window.close(), 1500);
  };

  document.getElementById('btn-quick-save').onclick = () => {
    const qs = new URLSearchParams({ url, title }).toString();
    chrome.tabs.create({ url: `${base}/share?${qs}` });
    showState('state-saved');
    setTimeout(() => window.close(), 1500);
  };

  document.getElementById('btn-options').onclick = () => chrome.runtime.openOptionsPage();
}

init();
