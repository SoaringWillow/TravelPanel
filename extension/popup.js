'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

const PLATFORMS = [
  { patterns: ['youtube.com', 'youtu.be'],                       name: 'YouTube',     color: '#FF0000' },
  { patterns: ['instagram.com'],                                  name: 'Instagram',   color: '#E1306C' },
  { patterns: ['tiktok.com'],                                     name: 'TikTok',      color: '#69C9D0' },
  { patterns: ['twitter.com', 'x.com'],                          name: 'Twitter / X', color: '#1DA1F2' },
  { patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'],   name: '小红书',        color: '#FF2442' },
  { patterns: ['douyin.com', 'iesdouyin.com'],                   name: 'Douyin',      color: '#161823' },
  { patterns: ['bilibili.com', 'b23.tv'],                        name: 'Bilibili',    color: '#00A1D6' },
  { patterns: ['weixin.qq.com', 'mp.weixin'],                    name: 'WeChat',      color: '#07C160' },
  { patterns: ['pinterest.com'],                                  name: 'Pinterest',   color: '#E60023' },
  { patterns: ['tripadvisor.com'],                                name: 'TripAdvisor', color: '#34E0A1' },
  { patterns: ['airbnb.com'],                                     name: 'Airbnb',      color: '#FF5A5F' },
  { patterns: ['booking.com'],                                    name: 'Booking.com', color: '#003580' },
  { patterns: ['google.com/maps', 'maps.google'],                name: 'Google Maps', color: '#4285F4' },
  { patterns: ['maps.apple.com'],                                 name: 'Apple Maps',  color: '#1aa3ff' },
];

function detectPlatform(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const full = hostname + pathname;
    for (const p of PLATFORMS) {
      if (p.patterns.some(pat => full.includes(pat))) return p;
    }
  } catch { /* ignore */ }
  return null;
}

function shortUrl(url, max = 46) {
  try {
    const { hostname, pathname } = new URL(url);
    const s = hostname + pathname.replace(/\/$/, '');
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function isUnclippable(url) {
  return /^(chrome|chrome-extension|edge|about|brave|file):\/\//i.test(url);
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], r => resolve((r.appUrl || '').trim() || DEFAULT_APP_URL));
  });
}

async function openTravelPanel(targetUrl) {
  const appUrl = await getAppUrl();
  const base = appUrl.replace(/\/$/, '');
  const clipUrl = `${base}?import=${encodeURIComponent(targetUrl)}`;

  const tabs = await chrome.tabs.query({});
  const tpTab = tabs.find(t => t.url && t.url.startsWith(base));

  if (tpTab) {
    await chrome.tabs.update(tpTab.id, { url: clipUrl, active: true });
    if (tpTab.windowId) await chrome.windows.update(tpTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: clipUrl });
  }
}

/* ── DOM wiring ── */

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  const clipBtn      = $('clipBtn');
  const clipText     = $('clipText');
  const clipIcon     = $('clipIcon');
  const pageTitleEl  = $('pageTitle');
  const pageUrlEl    = $('pageUrl');
  const platformEl   = $('platformBadge');
  const faviconEl    = $('favicon');
  const faviconFb    = $('faviconFallback');
  const statusEl     = $('status');

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status visible ${type}`;
  }

  function clearStatus() {
    statusEl.className = 'status';
    statusEl.textContent = '';
  }

  /* current tab */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url || '';
  const title = tab?.title || 'Untitled page';

  pageTitleEl.textContent = title.length > 80 ? title.slice(0, 80) + '…' : title;
  pageUrlEl.textContent   = shortUrl(url);

  /* favicon */
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.onerror = () => {
      faviconEl.style.display = 'none';
      faviconFb.style.display = 'block';
    };
  } else {
    faviconEl.style.display = 'none';
    faviconFb.style.display = 'block';
  }

  /* platform badge */
  const platform = detectPlatform(url);
  if (platform) {
    platformEl.textContent = platform.name;
    const hex = platform.color;
    platformEl.style.color       = hex;
    platformEl.style.borderColor = hex + '55';
    platformEl.style.background  = hex + '18';
  }

  /* disable on un-clippable pages */
  if (isUnclippable(url)) {
    clipBtn.disabled = true;
    clipText.textContent = 'Cannot clip this page';
    setStatus('Navigate to a travel page first', 'info');
  }

  /* open app */
  $('openApp').addEventListener('click', async () => {
    const appUrl = await getAppUrl();
    chrome.tabs.create({ url: appUrl });
  });

  /* settings */
  $('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  /* clip */
  clipBtn.addEventListener('click', async () => {
    if (clipBtn.disabled) return;

    clipBtn.disabled = true;
    clipBtn.classList.add('loading');
    clipText.textContent = 'Opening TravelPanel…';
    clearStatus();

    try {
      await openTravelPanel(url);
      clipBtn.classList.remove('loading');
      clipBtn.classList.add('success');
      clipIcon.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>';
      clipText.textContent = 'Clipped!';
      setStatus('AI is extracting pins and travel tips…', 'success');
      setTimeout(() => window.close(), 1600);
    } catch (err) {
      clipBtn.classList.remove('loading');
      clipBtn.disabled = false;
      clipText.textContent = 'Clip to TravelPanel';
      clipIcon.innerHTML = '<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>';
      setStatus('Could not open TravelPanel — check Settings', 'error');
      console.error('[TravelPanel Clipper]', err);
    }
  });
});
