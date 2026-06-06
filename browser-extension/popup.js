'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = [
  { key: 'youtube',      label: 'YouTube',     color: '#ef4444', re: /youtube\.com|youtu\.be/ },
  { key: 'instagram',    label: 'Instagram',   color: '#e1306c', re: /instagram\.com/ },
  { key: 'tiktok',       label: 'TikTok',      color: '#010101', re: /tiktok\.com/ },
  { key: 'xiaohongshu',  label: '小红书',       color: '#ff2442', re: /xiaohongshu\.com|xhslink\.com/ },
  { key: 'douyin',       label: 'Douyin',      color: '#010101', re: /douyin\.com/ },
  { key: 'bilibili',     label: 'bilibili',    color: '#00aeec', re: /bilibili\.com/ },
  { key: 'twitter',      label: 'X / Twitter', color: '#000000', re: /twitter\.com|x\.com/ },
  { key: 'facebook',     label: 'Facebook',    color: '#1877f2', re: /facebook\.com/ },
  { key: 'pinterest',    label: 'Pinterest',   color: '#e60023', re: /pinterest\.com/ },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.re.test(url)) return p;
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return { key: 'other', label: hostname, color: '#2563eb' };
  } catch {
    return { key: 'other', label: 'Web', color: '#2563eb' };
  }
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const short = u.hostname.replace(/^www\./, '') + (path.length > 32 ? path.slice(0, 32) + '…' : path);
    return short;
  } catch {
    return url.slice(0, 50);
  }
}

// Runs inside the page context via scripting.executeScript
function extractPageMetadata() {
  function meta(selector, attr = 'content') {
    return document.querySelector(selector)?.getAttribute(attr) || '';
  }
  return {
    title: meta('meta[property="og:title"]')
        || meta('meta[name="twitter:title"]')
        || document.title
        || '',
    description: meta('meta[property="og:description"]')
              || meta('meta[name="description"]')
              || '',
    image: meta('meta[property="og:image"]')
        || meta('meta[name="twitter:image"]')
        || '',
    url: window.location.href,
  };
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, r => resolve(r.appUrl || DEFAULT_APP_URL));
  });
}

// ── DOM helpers ────────────────────────────────────────

function show(id)  { document.getElementById(id).classList.remove('hidden'); }
function hide(id)  { document.getElementById(id).classList.add('hidden'); }
function text(id, val) { document.getElementById(id).textContent = val; }

// ── Init ───────────────────────────────────────────────

async function init() {
  const appUrl = await getAppUrl();
  document.getElementById('openAppLink').href = appUrl;

  // Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    showError('Could not access current tab.');
    return;
  }

  const url = tab?.url || '';

  // Disallow internal pages
  if (!url || /^(chrome|edge|about|moz-extension|chrome-extension):/.test(url)) {
    showError('Cannot clip browser pages.\nNavigate to a travel post and try again.');
    return;
  }

  // Try to extract OG metadata from the page
  let meta = { title: tab.title || '', url, description: '', image: '' };
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageMetadata,
    });
    if (result?.result) {
      meta = { ...meta, ...result.result };
      if (!meta.title) meta.title = tab.title || '';
    }
  } catch {
    // Page may not allow scripting (e.g. PDFs, some CSP pages) — fall back to tab info
  }

  // Show ready state
  hide('state-loading');

  const platform = detectPlatform(meta.url);
  const badge = document.getElementById('platformBadge');
  badge.textContent = platform.label;
  badge.style.background = platform.color;

  text('pageTitle', meta.title || 'Untitled');
  text('pageUrl', shortenUrl(meta.url));

  // Show thumbnail if present
  if (meta.image) {
    const img = document.getElementById('thumbImg');
    img.src = meta.image;
    img.onerror = () => document.getElementById('thumbWrap').classList.add('hidden');
    document.getElementById('thumbWrap').classList.remove('hidden');
  }

  show('state-ready');

  // ── Save button ──────────────────────────────────────

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const shareUrl = buildShareUrl(appUrl, meta.url, meta.title);

    // Open as a small popup window centred on screen
    const w = 420, h = 640;
    const left = Math.round((screen.width - w) / 2);
    const top  = Math.round((screen.height - h) / 2);
    chrome.windows.create({
      url: shareUrl,
      type: 'popup',
      width: w,
      height: h,
      left,
      top,
    });

    // Visual feedback before closing
    hide('state-ready');
    show('successMsg');
    document.getElementById('successMsg').classList.remove('hidden');
    setTimeout(() => window.close(), 800);
  });

  // ── Settings button ──────────────────────────────────

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function buildShareUrl(appUrl, pageUrl, title) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl, title });
  return `${base}/share?${params.toString()}`;
}

function showError(msg) {
  hide('state-loading');
  text('errorMsg', msg);
  show('state-error');
}

document.addEventListener('DOMContentLoaded', init);
