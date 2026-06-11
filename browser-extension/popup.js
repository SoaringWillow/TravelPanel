'use strict';

const DEFAULT_TP_URL = 'http://localhost:3000';

// ── Platform detection (mirrors lib/parse-url.ts) ─────────────────────────────
const PLATFORM_CONFIG = {
  instagram:    { label: 'Instagram',    color: '#e1306c' },
  youtube:      { label: 'YouTube',      color: '#ff0000' },
  xiaohongshu:  { label: '小红书',       color: '#fe2c55' },
  douyin:       { label: 'Douyin',       color: '#161823' },
  bilibili:     { label: 'Bilibili',     color: '#00a1d6' },
  tiktok:       { label: 'TikTok',       color: '#010101' },
  twitter:      { label: 'Twitter / X',  color: '#1da1f2' },
  other:        { label: 'Web',          color: '#6b7280' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('instagram.com'))  return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('douyin.com'))     return 'douyin';
  if (u.includes('bilibili.com'))   return 'bilibili';
  if (u.includes('tiktok.com'))     return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  return 'other';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showEl(...ids)  { ids.forEach(id => $(id)?.classList.remove('hidden')); }
function hideEl(...ids)  { ids.forEach(id => $(id)?.classList.add('hidden')); }

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

// ── Extract rich metadata from the active tab via scripting.executeScript ─────
async function getPageMetadata(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const meta = (prop) =>
        document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.content || '';
      return {
        url:         document.querySelector('link[rel="canonical"]')?.href || location.href,
        title:       meta('og:title') || document.title || '',
        description: meta('og:description') || meta('description') || '',
        thumbnail:   meta('og:image') || '',
      };
    },
  });
  return result?.result || {};
}

// ── Main ──────────────────────────────────────────────────────────────────────
let pageUrl   = '';
let pageTitle = '';
let tpUrl     = DEFAULT_TP_URL;

async function init() {
  // Load saved TravelPanel URL
  const stored = await chrome.storage.sync.get({ travelpanelUrl: DEFAULT_TP_URL });
  tpUrl = stored.travelpanelUrl.replace(/\/$/, '');
  $('footer-tp-url').textContent = tpUrl;

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { showError('No active tab found.'); return; }

  // Try to extract rich metadata; fall back to tab data
  let meta = { url: tab.url || '', title: tab.title || '', thumbnail: '' };
  try {
    const rich = await getPageMetadata(tab.id);
    meta.url       = rich.url       || meta.url;
    meta.title     = rich.title     || meta.title;
    meta.thumbnail = rich.thumbnail || '';
  } catch (_) {
    // Scripting may fail on chrome:// pages etc. — fall back silently
  }

  pageUrl   = meta.url;
  pageTitle = meta.title;

  // Populate UI
  $('page-title').textContent  = pageTitle || pageUrl;
  $('page-domain').textContent = getDomain(pageUrl);

  // Favicon
  if (tab.favIconUrl) {
    $('favicon').src = tab.favIconUrl;
    $('favicon').onload  = () => { showEl('favicon'); hideEl('favicon-placeholder'); };
    $('favicon').onerror = () => { showEl('favicon-placeholder'); hideEl('favicon'); };
  } else {
    showEl('favicon-placeholder');
  }

  // Thumbnail
  if (meta.thumbnail) {
    $('thumbnail-img').src = meta.thumbnail;
    $('thumbnail-img').onload  = () => $('thumbnail-wrap').classList.add('visible');
    $('thumbnail-img').onerror = () => {};
  }

  // Platform chip
  const platform = detectPlatform(pageUrl);
  if (platform !== 'other') {
    const cfg = PLATFORM_CONFIG[platform];
    const chip = $('platform-chip');
    chip.textContent           = cfg.label;
    chip.style.backgroundColor = cfg.color;
    showEl('platform-chip');
  }

  // Transition to clip UI
  hideEl('state-loading');
  showEl('clip-ui');
}

function openSharePage() {
  const shareUrl =
    `${tpUrl}/share` +
    `?url=${encodeURIComponent(pageUrl)}` +
    `&title=${encodeURIComponent(pageTitle)}`;
  chrome.tabs.create({ url: shareUrl });
}

function showError(msg) {
  hideEl('state-loading');
  showEl('clip-ui');
  const errEl = $('error-msg');
  errEl.textContent = msg;
  errEl.classList.add('visible');
}

// ── Event listeners ───────────────────────────────────────────────────────────
$('btn-save').addEventListener('click', () => {
  if (!pageUrl) { showError('No page URL found.'); return; }

  // Show success state immediately (the share page handles the actual save)
  hideEl('clip-ui', 'footer');
  $('state-success').classList.add('visible');
  $('success-sub').textContent = `Opening share page for ${getDomain(pageUrl)}…`;

  openSharePage();

  // Auto-close popup after a short delay
  setTimeout(() => window.close(), 1500);
});

$('btn-open-app').addEventListener('click', () => {
  chrome.tabs.create({ url: tpUrl });
  window.close();
});

$('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

$('footer-settings-link').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init().catch((err) => showError(err.message || 'Something went wrong.'));
