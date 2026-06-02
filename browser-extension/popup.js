'use strict';

const DEFAULT_BASE_URL = 'http://localhost:3000';

// Platform detection (mirrors lib/parse-url.ts)
const PLATFORM_PATTERNS = [
  { pattern: /xiaohongshu\.com|xhslink\.com|xhs\.link/, label: '小红书', color: '#FF2442', bg: 'rgba(255,36,66,0.12)' },
  { pattern: /douyin\.com|iesdouyin\.com/, label: 'Douyin', color: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
  { pattern: /tiktok\.com/, label: 'TikTok', color: '#FF0050', bg: 'rgba(255,0,80,0.1)' },
  { pattern: /bilibili\.com|b23\.tv/, label: 'Bilibili', color: '#00A1D6', bg: 'rgba(0,161,214,0.1)' },
  { pattern: /youtube\.com|youtu\.be/, label: 'YouTube', color: '#FF0000', bg: 'rgba(255,0,0,0.1)' },
  { pattern: /instagram\.com/, label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.1)' },
  { pattern: /weixin\.qq\.com|mp\.weixin/, label: 'WeChat', color: '#07C160', bg: 'rgba(7,193,96,0.1)' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return { label: 'Web', color: '#64748B', bg: 'rgba(100,116,139,0.1)' };
}

function truncateUrl(url, max = 48) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > max ? short.slice(0, max) + '…' : short;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL }, resolve);
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.addEventListener('DOMContentLoaded', async () => {
  let tab;
  let settings;

  try {
    [tab, settings] = await Promise.all([getCurrentTab(), getSettings()]);
  } catch (err) {
    showError('Could not read tab info.');
    return;
  }

  const { baseUrl } = settings;

  // Populate page card
  const pageInfo = document.getElementById('pageInfo');
  const faviconWrap = document.getElementById('faviconWrap');
  const clipBtn = document.getElementById('clipBtn');
  const openBtn = document.getElementById('openBtn');

  // Favicon
  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.className = 'favicon-img';
    img.src = tab.favIconUrl;
    img.onerror = () => img.remove();
    faviconWrap.innerHTML = '';
    faviconWrap.appendChild(img);
  }

  // Platform badge
  const plat = detectPlatform(tab.url || '');
  const badge = document.createElement('div');
  badge.className = 'platform-badge';
  badge.style.cssText = `color:${plat.color}; background:${plat.bg};`;
  badge.textContent = plat.label;

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'page-title';
  titleEl.textContent = tab.title || tab.url || 'Untitled';

  // URL
  const urlEl = document.createElement('div');
  urlEl.className = 'page-url';
  urlEl.textContent = truncateUrl(tab.url || '');

  // Replace skeletons
  pageInfo.innerHTML = '';
  pageInfo.appendChild(badge);
  pageInfo.appendChild(titleEl);
  pageInfo.appendChild(urlEl);

  // Enable clip button
  clipBtn.disabled = false;

  // ── Settings button ──────────────────────────────────────────────────────────
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // ── Open TravelPanel button ──────────────────────────────────────────────────
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: baseUrl });
    window.close();
  });

  // ── Clip button ──────────────────────────────────────────────────────────────
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;

    const statusEl = document.getElementById('status');
    statusEl.className = 'status loading';
    statusEl.innerHTML = '<div class="spinner"></div> Opening TravelPanel…';

    const shareUrl = buildShareUrl(baseUrl, tab.url, tab.title);

    chrome.tabs.create({ url: shareUrl }, () => {
      if (chrome.runtime.lastError) {
        showError('Could not open TravelPanel. Check Settings.');
        clipBtn.disabled = false;
        return;
      }
      statusEl.className = 'status success';
      statusEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7L5.5 10.5L12 3.5" stroke="#4ADE80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Opened in TravelPanel
      `;
      setTimeout(() => window.close(), 900);
    });
  });
});

function buildShareUrl(baseUrl, pageUrl, pageTitle) {
  const params = new URLSearchParams();
  if (pageUrl) params.set('url', pageUrl);
  if (pageTitle) params.set('title', pageTitle);
  return `${baseUrl.replace(/\/$/, '')}/share?${params.toString()}`;
}

function showError(msg) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.className = 'status error';
    statusEl.textContent = '⚠ ' + msg;
  }
}
