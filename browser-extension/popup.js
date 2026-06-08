'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_CONFIG = {
  wechat:       { label: 'WeChat',          color: '#07C160', text: '#fff' },
  xiaohongshu:  { label: '小红书',           color: '#FF2442', text: '#fff' },
  douyin:       { label: 'Douyin / TikTok', color: '#222',    text: '#fff' },
  bilibili:     { label: 'Bilibili',        color: '#00AEEC', text: '#fff' },
  instagram:    { label: 'Instagram',       color: '#E1306C', text: '#fff' },
  youtube:      { label: 'YouTube',         color: '#FF0000', text: '#fff' },
  other:        { label: 'Web',             color: '#6366f1', text: '#fff' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin/i.test(url)) return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com|tiktok\.com/i.test(url)) return 'douyin';
  if (/bilibili\.com|b23\.tv/i.test(url)) return 'bilibili';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'other';
}

function isClippableUrl(url) {
  if (!url) return false;
  return /^https?:\/\//.test(url);
}

function truncateUrl(url, maxLen = 52) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + '…' : display;
  } catch {
    return url.slice(0, maxLen);
  }
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';

  const platform = detectPlatform(url);
  const cfg = PLATFORM_CONFIG[platform];

  // Populate page card
  const badge = document.getElementById('platform-badge');
  badge.textContent = cfg.label;
  badge.style.background = cfg.color;
  badge.style.color = cfg.text;

  document.getElementById('page-title').textContent = title || '(No title)';
  document.getElementById('page-url').textContent = truncateUrl(url);

  const clipBtn = document.getElementById('clip-btn');
  const unsupported = document.getElementById('unsupported');

  if (!isClippableUrl(url)) {
    clipBtn.hidden = true;
    unsupported.hidden = false;
    return;
  }

  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = 'Opening…';

    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    // Show success briefly before opening the tab
    document.getElementById('main-view').hidden = true;
    document.getElementById('success-view').hidden = false;

    setTimeout(() => {
      chrome.tabs.create({ url: shareUrl });
      window.close();
    }, 600);
  });

  // Load app URL into settings input
  const appUrl = await getAppUrl();
  document.getElementById('app-url-input').value = appUrl === DEFAULT_APP_URL ? '' : appUrl;
  document.getElementById('app-url-input').placeholder = DEFAULT_APP_URL;
}

// Settings panel toggle
document.getElementById('settings-toggle').addEventListener('click', () => {
  const panel = document.getElementById('settings-panel');
  panel.hidden = !panel.hidden;
});

// Settings save
document.getElementById('settings-save-btn').addEventListener('click', () => {
  const input = document.getElementById('app-url-input').value.trim();
  const url = input || DEFAULT_APP_URL;

  // Validate URL
  try {
    new URL(url);
  } catch {
    document.getElementById('app-url-input').style.borderColor = '#ef4444';
    return;
  }

  document.getElementById('app-url-input').style.borderColor = '';
  chrome.storage.local.set({ appUrl: url }, () => {
    const msg = document.getElementById('settings-saved-msg');
    msg.hidden = false;
    setTimeout(() => { msg.hidden = true; }, 2000);
  });
});

init();
