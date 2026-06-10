'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORM_LABELS = {
  xiaohongshu: '小红书',
  douyin:      'Douyin',
  tiktok:      'TikTok',
  bilibili:    'Bilibili',
  wechat:      'WeChat',
  instagram:   'Instagram',
  youtube:     'YouTube',
  other:       'Web',
};

function detectPlatform(url) {
  if (/xiaohongshu\.com|xhslink\.com/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com/.test(url))      return 'douyin';
  if (/tiktok\.com/.test(url))                     return 'tiktok';
  if (/bilibili\.com|b23\.tv/.test(url))           return 'bilibili';
  if (/weixin\.qq\.com|mp\.weixin/.test(url))      return 'wechat';
  if (/instagram\.com/.test(url))                  return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url))          return 'youtube';
  return 'other';
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Injected into the active tab to extract page metadata
function extractPageMetadata() {
  const getMeta = (selector) =>
    document.querySelector(selector)?.getAttribute('content') || '';

  return {
    title:       document.title,
    url:         document.querySelector('link[rel="canonical"]')?.href || location.href,
    description: getMeta('meta[property="og:description"]') ||
                 getMeta('meta[name="description"]'),
    thumbnail:   getMeta('meta[property="og:image"]') ||
                 getMeta('meta[name="twitter:image"]'),
  };
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const loading       = $('loading');
const clipForm      = $('clip-form');
const savedState    = $('saved-state');
const errorState    = $('error-state');
const unsupported   = $('unsupported-state');
const saveBtn       = $('saveBtn');
const openAppBtn    = $('openAppBtn');
const openAppBtn2   = $('openAppBtn2');
const retryBtn      = $('retryBtn');
const settingsLink  = $('settingsLink');

function show(el) {
  [loading, clipForm, savedState, errorState, unsupported].forEach(e => e.classList.add('hidden'));
  el.classList.remove('hidden');
}

// ── Main ──────────────────────────────────────────────────────────────────────
let currentMeta = null;
let appUrl = DEFAULT_APP_URL;

async function init() {
  show(loading);

  // Load saved app URL
  try {
    const stored = await chrome.storage.sync.get('appUrl');
    if (stored.appUrl) appUrl = stored.appUrl;
  } catch { /* storage not available in some contexts */ }

  // Wire settings link
  settingsLink.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    showError('Could not access the current tab.');
    return;
  }

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    show(unsupported);
    return;
  }

  // Try to extract rich metadata via script injection; fall back to tab info
  let meta = { title: tab.title || '', url: tab.url, description: '', thumbnail: '' };
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageMetadata,
    });
    if (results?.[0]?.result) {
      meta = { ...meta, ...results[0].result };
    }
  } catch { /* scripting blocked on some pages */ }

  currentMeta = meta;
  renderClipForm(meta);
}

function renderClipForm(meta) {
  const platform = detectPlatform(meta.url);
  const label    = PLATFORM_LABELS[platform] || 'Web';

  // Thumbnail
  if (meta.thumbnail) {
    const img = $('thumbnail');
    img.src = meta.thumbnail;
    img.onerror = () => $('thumbnail-wrap').classList.add('hidden');
    $('thumbnail-wrap').classList.remove('hidden');
  }

  // Platform badge
  const badge = $('platform-badge');
  badge.textContent = label;
  badge.className = `platform-badge ${platform}`;

  $('domain').textContent = getDomain(meta.url);
  $('clip-title').textContent = meta.title || 'Untitled page';

  if (meta.description) {
    $('clip-desc').textContent = meta.description;
    $('clip-desc').classList.remove('hidden');
  }

  show(clipForm);
}

function buildShareUrl(meta) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('url', meta.url);
  if (meta.title) params.set('title', meta.title);
  return `${base}/share?${params.toString()}`;
}

function showError(msg) {
  if (msg) $('error-msg').textContent = msg;
  show(errorState);
}

// ── Buttons ───────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  if (!currentMeta) return;
  saveBtn.disabled = true;
  show(savedState);

  try {
    await chrome.tabs.create({ url: buildShareUrl(currentMeta) });
  } catch {
    show(savedState); // still show success — tab may open anyway
  }

  setTimeout(() => window.close(), 1200);
});

openAppBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl.replace(/\/$/, '') });
  window.close();
});

openAppBtn2?.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl.replace(/\/$/, '') });
  window.close();
});

retryBtn.addEventListener('click', () => init());

init();
