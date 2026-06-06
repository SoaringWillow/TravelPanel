'use strict';

const DEFAULT_APP_URL = '';

// Platform detection mirrors lib/parse-url.ts
const PLATFORMS = [
  { id: 'wechat',      label: 'WeChat',    color: '#07C160', patterns: ['weixin.qq.com', 'mp.weixin'] },
  { id: 'xiaohongshu', label: '小红书',     color: '#FF2442', patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'] },
  { id: 'douyin',      label: 'Douyin',    color: '#161823', patterns: ['douyin.com', 'iesdouyin.com', 'tiktok.com'] },
  { id: 'bilibili',    label: 'Bilibili',  color: '#00AEEC', patterns: ['bilibili.com', 'b23.tv'] },
  { id: 'youtube',     label: 'YouTube',   color: '#FF0000', patterns: ['youtube.com', 'youtu.be'] },
  { id: 'instagram',   label: 'Instagram', color: '#E1306C', patterns: ['instagram.com'] },
  { id: 'twitter',     label: 'Twitter',   color: '#1DA1F2', patterns: ['twitter.com', 'x.com'] },
];

function detectPlatform(url) {
  const lower = url.toLowerCase();
  for (const p of PLATFORMS) {
    if (p.patterns.some(pat => lower.includes(pat))) return p;
  }
  return { id: 'other', label: 'Web', color: '#6366F1' };
}

function show(stateId) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById('state-' + stateId);
  if (el) el.classList.remove('hidden');
}

let currentUrl = '';
let currentTitle = '';
let appUrl = DEFAULT_APP_URL;

async function init() {
  const stored = await chrome.storage.sync.get(['appUrl']);
  appUrl = (stored.appUrl || '').trim();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab.url || '';
  currentTitle = tab.title || '';

  if (!appUrl) {
    show('setup');
    document.getElementById('setup-open-options').addEventListener('click', openOptions);
    wireFooter();
    return;
  }

  populateIdle();
  show('idle');
  wireFooter();

  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('settings-btn').addEventListener('click', openOptions);
}

function populateIdle() {
  const platform = detectPlatform(currentUrl);

  const badge = document.getElementById('platform-badge');
  badge.textContent = platform.label;
  badge.style.background = platform.color;

  const titleEl = document.getElementById('tab-title');
  titleEl.textContent = currentTitle || '';

  const urlEl = document.getElementById('url-display');
  urlEl.textContent = currentUrl;
}

async function handleSave() {
  show('saving');

  try {
    // Build share URL — share page already handles ?url= param
    const shareUrl = appUrl.replace(/\/$/, '') +
      '/share?url=' + encodeURIComponent(currentUrl) +
      (currentTitle ? '&title=' + encodeURIComponent(currentTitle) : '');

    await chrome.tabs.create({ url: shareUrl });

    show('done');

    // Auto-close popup after 1.5s
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    showError(err.message || 'Could not open TravelPanel.');
  }
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  show('error');
  document.getElementById('retry-btn').addEventListener('click', handleSave, { once: true });
  document.getElementById('error-settings-btn').addEventListener('click', openOptions, { once: true });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function wireFooter() {
  document.getElementById('open-app-link').addEventListener('click', (e) => {
    e.preventDefault();
    if (appUrl) {
      chrome.tabs.create({ url: appUrl });
    } else {
      openOptions();
    }
  });
  document.getElementById('options-link').addEventListener('click', (e) => {
    e.preventDefault();
    openOptions();
  });
}

init().catch(err => {
  document.getElementById('error-msg').textContent = err.message || 'Failed to initialise.';
  show('error');
});
