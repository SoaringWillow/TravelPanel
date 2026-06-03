'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORMS = {
  instagram:    { label: 'Instagram',  color: '#E1306C' },
  youtube:      { label: 'YouTube',    color: '#FF0000' },
  tiktok:       { label: 'TikTok',     color: '#69C9D0' },
  xiaohongshu:  { label: '小红书',     color: '#FF2442' },
  wechat:       { label: 'WeChat',     color: '#07C160' },
  bilibili:     { label: 'Bilibili',   color: '#00A1D6' },
  douyin:       { label: 'Douyin',     color: '#94ecf8' },
  twitter:      { label: 'X / Twitter', color: '#1DA1F2' },
  pinterest:    { label: 'Pinterest',  color: '#E60023' },
  tripadvisor:  { label: 'TripAdvisor', color: '#34E0A1' },
  web:          { label: 'Web',        color: '#6B7280' },
};

function detectPlatform(url) {
  if (!url) return 'web';
  if (/instagram\.com/.test(url))                         return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url))                 return 'youtube';
  if (/tiktok\.com/.test(url))                            return 'tiktok';
  if (/xiaohongshu\.com|xhslink\.com/.test(url))         return 'xiaohongshu';
  if (/weixin\.qq\.com|mp\.weixin/.test(url))             return 'wechat';
  if (/bilibili\.com|b23\.tv/.test(url))                  return 'bilibili';
  if (/douyin\.com/.test(url))                            return 'douyin';
  if (/twitter\.com|x\.com/.test(url))                   return 'twitter';
  if (/pinterest\.com/.test(url))                         return 'pinterest';
  if (/tripadvisor\.com/.test(url))                       return 'tripadvisor';
  return 'web';
}

function shortUrl(url, max = 48) {
  if (!url || url.length <= max) return url;
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname.length > 20 ? pathname.slice(0, 20) + '…' : pathname;
    return hostname + path;
  } catch {
    return url.slice(0, max) + '…';
  }
}

function showState(id) {
  ['idleState', 'loadingState', 'successState', 'errorState'].forEach(s => {
    document.getElementById(s)?.classList.toggle('hidden', s !== id);
  });
}

function $ (id) { return document.getElementById(id); }

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, r => {
      resolve((r.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

async function clipUrl(url) {
  if (!url) return;
  showState('loadingState');
  try {
    const appUrl = await getAppUrl();
    const target  = `${appUrl}/?import=${encodeURIComponent(url)}`;
    const existing = await chrome.tabs.query({ url: `${appUrl}/*` });

    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { active: true, url: target });
      await chrome.windows.update(existing[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: target });
    }
    showState('successState');
  } catch (err) {
    showState('errorState');
    const el = $('errorMessage');
    if (el) el.textContent = err?.message || 'Failed to open TravelPanel';
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const appUrl = await getAppUrl();

  // Footer "Open app" link
  const openLink = $('openAppLink');
  if (openLink) {
    openLink.href = appUrl;
    openLink.addEventListener('click', e => {
      e.preventDefault();
      chrome.tabs.create({ url: appUrl });
      window.close();
    });
  }

  if (tab) {
    const platform = detectPlatform(tab.url);
    const info = PLATFORMS[platform] || PLATFORMS.web;

    const badge = $('platformBadge');
    if (badge) {
      badge.textContent = info.label;
      badge.style.cssText = `
        background-color:${info.color}22;
        color:${info.color};
        border-color:${info.color}55;
      `;
    }

    const titleEl = $('pageTitle');
    if (titleEl) titleEl.textContent = tab.title || 'Untitled';

    const urlEl = $('pageUrl');
    if (urlEl) urlEl.textContent = shortUrl(tab.url);

    $('clipBtn')?.addEventListener('click', () => clipUrl(tab.url));
  }

  // Custom URL
  const customBtn   = $('customClipBtn');
  const customInput = $('customUrl');
  if (customBtn && customInput) {
    const go = () => {
      const val = customInput.value.trim();
      if (val) clipUrl(val);
    };
    customBtn.addEventListener('click', go);
    customInput.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  $('retryBtn')?.addEventListener('click', () => showState('idleState'));
  $('clipAnotherBtn')?.addEventListener('click', () => showState('idleState'));
  $('settingsBtn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

document.addEventListener('DOMContentLoaded', init);
