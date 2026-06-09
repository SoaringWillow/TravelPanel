'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ─────────────────────────

const PLATFORM_PATTERNS = [
  { key: 'xiaohongshu', patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'], label: 'Little Red Book', color: '#ff2442' },
  { key: 'douyin',      patterns: ['douyin.com', 'iesdouyin.com', 'tiktok.com'],   label: 'Douyin / TikTok', color: '#000000' },
  { key: 'bilibili',    patterns: ['bilibili.com', 'b23.tv'],                       label: 'Bilibili',         color: '#fb7299' },
  { key: 'wechat',      patterns: ['weixin.qq.com', 'mp.weixin'],                   label: 'WeChat',           color: '#07c160' },
  { key: 'instagram',   patterns: ['instagram.com'],                                label: 'Instagram',        color: '#e1306c' },
  { key: 'youtube',     patterns: ['youtube.com', 'youtu.be'],                      label: 'YouTube',          color: '#ff0000' },
];

function detectPlatform(url) {
  const lower = url.toLowerCase();
  for (const p of PLATFORM_PATTERNS) {
    if (p.patterns.some(pat => lower.includes(pat))) return p;
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showState(name) {
  ['setupState', 'mainState', 'blockedState'].forEach(s => {
    const el = $(s);
    if (el) el.hidden = (s !== name);
  });
}

function isClippableUrl(url) {
  if (!url) return false;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false;
  if (url.startsWith('about:') || url.startsWith('moz-extension://')) return false;
  if (url.startsWith('edge://') || url.startsWith('file://')) return false;
  return true;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    let display = u.hostname + u.pathname;
    if (display.length > 42) display = display.slice(0, 40) + '…';
    return display;
  } catch {
    return url.slice(0, 42);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Get stored app URL
  const { appUrl } = await chrome.storage.sync.get('appUrl');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl   = tab?.url ?? '';
  const currentTitle = tab?.title ?? 'Untitled page';
  const currentFavicon = tab?.favIconUrl ?? '';

  // ── Settings button ──────────────────────────────
  $('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // ── Blocked URLs ─────────────────────────────────
  if (!isClippableUrl(currentUrl)) {
    $('blockedReason').textContent =
      'Navigate to a travel page — Instagram, YouTube, a blog, or any URL — then click the extension.';
    showState('blockedState');
    return;
  }

  // ── Setup state ───────────────────────────────────
  if (!appUrl) {
    showState('setupState');

    const input = $('appUrlInput');
    const connectBtn = $('connectBtn');

    input.addEventListener('input', () => {
      const val = input.value.trim();
      connectBtn.disabled = !val || !val.startsWith('http');
    });

    connectBtn.addEventListener('click', async () => {
      let url = input.value.trim();
      if (!url.endsWith('/')) url = url.replace(/\/$/, '');
      await chrome.storage.sync.set({ appUrl: url });
      // Notify background to recreate context menus
      chrome.runtime.sendMessage({ type: 'APP_URL_UPDATED', appUrl: url });
      initMainState(url, currentUrl, currentTitle, currentFavicon);
    });

    return;
  }

  // ── Main state ────────────────────────────────────
  initMainState(appUrl, currentUrl, currentTitle, currentFavicon);
});

function initMainState(appUrl, currentUrl, currentTitle, faviconUrl) {
  showState('mainState');

  // Populate page card
  const favicon = $('pageFavicon');
  if (faviconUrl) {
    favicon.src = faviconUrl;
    favicon.hidden = false;
  } else {
    favicon.hidden = true;
  }

  $('pageTitle').textContent = currentTitle || '(no title)';
  $('pageUrl').textContent   = truncateUrl(currentUrl);

  // Platform badge
  const platform = detectPlatform(currentUrl);
  if (platform) {
    const badge = $('platformBadge');
    badge.textContent = platform.label;
    badge.style.backgroundColor = platform.color + '22'; // 13% opacity
    badge.style.color = platform.color;
    $('platformRow').hidden = false;
  }

  // Save button
  $('saveBtn').addEventListener('click', () => {
    const shareUrl = buildShareUrl(appUrl, currentUrl, currentTitle);
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // Open app button
  $('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

function buildShareUrl(appUrl, pageUrl, pageTitle) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    url: pageUrl,
    title: pageTitle || '',
  });
  return `${base}/share?${params.toString()}`;
}
