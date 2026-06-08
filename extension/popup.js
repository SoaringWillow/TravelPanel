// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const PLATFORM_META = {
  youtube:      { label: 'YouTube',      emoji: '▶️' },
  instagram:    { label: 'Instagram',    emoji: '📷' },
  xiaohongshu:  { label: 'Xiaohongshu', emoji: '📕' },
  douyin:       { label: 'TikTok',       emoji: '🎵' },
  bilibili:     { label: 'Bilibili',     emoji: '📺' },
  wechat:       { label: 'WeChat',       emoji: '💬' },
  twitter:      { label: 'Twitter/X',    emoji: '🐦' },
  other:        { label: 'Web',          emoji: '🌐' },
};

// ── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com'))   return 'instagram';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('douyin.com') || u.includes('tiktok.com'))        return 'douyin';
  if (u.includes('bilibili.com'))    return 'bilibili';
  if (u.includes('wechat.com') || u.includes('weixin.qq.com'))     return 'wechat';
  if (u.includes('twitter.com') || u.includes('x.com'))            return 'twitter';
  return 'other';
}

// ── State management ───────────────────────────────────────────────────────

let currentUrl   = '';
let currentTitle = '';
let appUrl       = DEFAULT_APP_URL;

function showState(id) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ── DOM refs ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Render preview ─────────────────────────────────────────────────────────

function renderPreview({ url, title, thumbnail, platform }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.other;

  // Platform badge
  const badge = $('platform-badge');
  badge.textContent = `${meta.emoji} ${meta.label}`;
  badge.className = `platform-badge ${platform}`;

  // Title
  $('preview-title').textContent = title || 'Untitled page';

  // URL (show host only)
  try {
    $('preview-url').textContent = new URL(url).hostname;
  } catch {
    $('preview-url').textContent = url.slice(0, 50);
  }

  // Thumbnail
  if (thumbnail) {
    const img = $('preview-thumb');
    img.src = thumbnail;
    img.classList.remove('hidden');
    $('preview-thumb-placeholder').classList.add('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      $('preview-thumb-placeholder').classList.remove('hidden');
    };
  }

  showState('state-ready');
}

// ── Boot ───────────────────────────────────────────────────────────────────

async function boot() {
  showState('state-loading');

  // Load saved app URL from settings
  try {
    const stored = await chrome.storage.sync.get('appUrl');
    if (stored.appUrl) appUrl = stored.appUrl;
  } catch { /* ignore */ }

  // Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showState('state-error');
    return;
  }

  // Guard: extension/system pages can't be clipped
  const url = tab?.url ?? '';
  if (!url || url.startsWith('chrome') || url.startsWith('edge') || url.startsWith('about')) {
    showState('state-not-supported');
    return;
  }

  currentUrl   = url;
  currentTitle = tab.title ?? '';

  // Try to get enhanced metadata from content script
  let thumbnail = '';
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageMeta,
    });
    if (result?.result) {
      if (result.result.title)     currentTitle = result.result.title || currentTitle;
      if (result.result.thumbnail) thumbnail    = result.result.thumbnail;
    }
  } catch {
    // Content script blocked on this page — use tab info as fallback
  }

  renderPreview({
    url:      currentUrl,
    title:    currentTitle,
    thumbnail,
    platform: detectPlatform(currentUrl),
  });
}

// Injected into page context to extract og: metadata
function extractPageMeta() {
  const get = (selector) => document.querySelector(selector)?.content?.trim() ?? '';
  return {
    title: get('meta[property="og:title"]') || get('meta[name="twitter:title"]') || document.title,
    thumbnail:
      get('meta[property="og:image"]') ||
      get('meta[name="twitter:image"]') ||
      get('meta[property="og:image:url"]'),
  };
}

// ── Actions ────────────────────────────────────────────────────────────────

function handleClip() {
  const shareUrl =
    appUrl.replace(/\/$/, '') +
    '/share' +
    '?url=' + encodeURIComponent(currentUrl) +
    '&title=' + encodeURIComponent(currentTitle);

  showState('state-success');

  // Small delay so user sees the success state, then close
  setTimeout(async () => {
    try {
      await chrome.tabs.create({ url: shareUrl });
    } catch {
      // If tab creation fails, try opening in current tab
      await chrome.tabs.update({ url: shareUrl });
    }
    window.close();
  }, 800);
}

function handleOpenSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

// ── Event wiring ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  boot();

  $('btn-clip')?.addEventListener('click', handleClip);
  $('btn-settings')?.addEventListener('click', handleOpenSettings);
  $('btn-retry')?.addEventListener('click', boot);
  $('btn-open-settings-err')?.addEventListener('click', handleOpenSettings);
});
