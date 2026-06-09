'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection — mirrors lib/parse-url.ts
const PLATFORMS = [
  {
    id: 'wechat',
    label: 'WeChat',
    color: '#07C160',
    match: (url) => url.includes('weixin.qq.com') || url.includes('mp.weixin'),
  },
  {
    id: 'xiaohongshu',
    label: 'Little Red Book',
    color: '#FF2442',
    match: (url) => url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link'),
  },
  {
    id: 'douyin',
    label: 'Douyin / TikTok',
    color: '#161823',
    match: (url) => url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com'),
  },
  {
    id: 'bilibili',
    label: 'Bilibili',
    color: '#00AEEC',
    match: (url) => url.includes('bilibili.com') || url.includes('b23.tv'),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    match: (url) => url.includes('instagram.com'),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    match: (url) => url.includes('youtube.com') || url.includes('youtu.be'),
  },
];

function detectPlatform(url) {
  if (!url) return { id: 'other', label: 'Web', color: '#6366F1' };
  for (const p of PLATFORMS) {
    if (p.match(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6366F1' };
}

function truncateUrl(url) {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname.replace(/\/$/, '');
    return display.length > 48 ? display.slice(0, 48) + '…' : display;
  } catch {
    return url.length > 48 ? url.slice(0, 48) + '…' : url;
  }
}

function isSaveableUrl(url) {
  if (!url) return false;
  const blocked = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://'];
  return !blocked.some((prefix) => url.startsWith(prefix));
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function el(id) { return document.getElementById(id); }

// ── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';

  // 2. Load saved app URL
  const storage = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  let appUrl = (storage.appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

  // 3. Detect platform and update badge
  const platform = detectPlatform(url);
  const badge = el('platform-badge');
  badge.textContent = platform.label;
  badge.style.backgroundColor = platform.color;
  // Ensure legible text contrast
  const darkBgs = ['#161823', '#010101'];
  badge.style.color = darkBgs.includes(platform.color) ? '#ffffff' : '#ffffff';

  // 4. Populate URL card
  el('page-title').textContent = title || '(No title)';
  el('page-url').textContent = truncateUrl(url);

  // 5. Handle unsaveable pages (new tab, browser internals)
  const saveable = isSaveableUrl(url);
  const saveBtn = el('save-btn');

  if (!saveable) {
    saveBtn.disabled = true;
    saveBtn.querySelector('svg').style.display = 'none';
    saveBtn.querySelector('svg').insertAdjacentHTML('afterend', '');
    saveBtn.lastChild.textContent = 'Navigate to a webpage first';
    el('error-msg').textContent = 'Open a travel page, then click the TravelPanel icon.';
    show('error-msg');
  }

  // 6. Save button — opens share page in new tab
  saveBtn.addEventListener('click', () => {
    if (!saveable) return;
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // 7. Settings navigation
  el('settings-btn').addEventListener('click', () => {
    hide('main-view');
    show('settings-view');
    el('app-url-input').value = appUrl;
  });

  el('back-btn').addEventListener('click', () => {
    hide('settings-view');
    show('main-view');
  });

  // 8. Save settings
  el('save-settings-btn').addEventListener('click', async () => {
    const raw = el('app-url-input').value.trim().replace(/\/$/, '');
    if (!raw) return;

    let normalized = raw;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    await chrome.storage.sync.set({ appUrl: normalized });
    appUrl = normalized;

    show('settings-saved');
    setTimeout(() => hide('settings-saved'), 2500);
  });

  // Enter key in settings input
  el('app-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el('save-settings-btn').click();
  });
});
