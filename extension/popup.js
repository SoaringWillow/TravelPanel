'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

// Platform detection mirrors lib/parse-url.ts
const PLATFORM_LABELS = {
  wechat:       'WeChat',
  xiaohongshu:  'Xiaohongshu',
  douyin:       'Douyin',
  bilibili:     'Bilibili',
  instagram:    'Instagram',
  youtube:      'YouTube',
  tiktok:       'TikTok',
  twitter:      'Twitter/X',
  other:        'Web',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin.qq.com')) return 'wechat';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'other';
}

function isClippable(url) {
  if (!url) return false;
  return (
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('moz-extension://') &&
    !url.startsWith('about:') &&
    !url.startsWith('edge://')
  );
}

async function init() {
  const titleEl       = document.getElementById('page-title');
  const urlEl         = document.getElementById('page-url');
  const platformEl    = document.getElementById('platform-chip');
  const clipBtn       = document.getElementById('clip-btn');
  const warningEl     = document.getElementById('warning');
  const successEl     = document.getElementById('success-flash');
  const settingsBtn   = document.getElementById('settings-btn');
  const openOptionsEl = document.getElementById('open-options');

  // ── Read current tab ──────────────────────────────────────────────────────
  let tabUrl   = '';
  let tabTitle = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl   = tab?.url   ?? '';
    tabTitle = tab?.title ?? '';
  } catch {
    tabTitle = 'Could not read page';
  }

  // ── Read configured app URL ───────────────────────────────────────────────
  let appUrl = DEFAULT_APP_URL;
  try {
    const stored = await chrome.storage.sync.get('appUrl');
    if (stored.appUrl) appUrl = stored.appUrl;
  } catch {
    // storage unavailable — use default
  }

  // ── Render preview ────────────────────────────────────────────────────────
  const platform = detectPlatform(tabUrl);
  platformEl.textContent = PLATFORM_LABELS[platform] ?? 'Web';

  titleEl.textContent = tabTitle || 'Untitled page';
  urlEl.textContent   = tabUrl   || '';

  // ── Configure clip button ─────────────────────────────────────────────────
  const canClip = isClippable(tabUrl);

  if (!canClip) {
    clipBtn.textContent = 'Cannot clip this page';
    clipBtn.disabled = true;
  } else if (!appUrl) {
    clipBtn.disabled = true;
    warningEl.classList.add('visible');
  } else {
    clipBtn.disabled = false;
  }

  // ── Clip handler ──────────────────────────────────────────────────────────
  clipBtn.addEventListener('click', () => {
    if (!tabUrl || !appUrl) return;

    const shareUrl =
      appUrl.replace(/\/$/, '') +
      '/share?url=' + encodeURIComponent(tabUrl) +
      '&title=' + encodeURIComponent(tabTitle);

    successEl.classList.add('visible');
    clipBtn.disabled = true;

    chrome.tabs.create({ url: shareUrl });

    // Small delay so user sees the flash before popup closes
    setTimeout(() => window.close(), 600);
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  if (openOptionsEl) {
    openOptionsEl.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
}

init();
