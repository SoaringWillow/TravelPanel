'use strict';

const PLATFORM_CONFIG = {
  wechat:       { label: 'WeChat',       color: '#07C160' },
  xiaohongshu:  { label: 'Xiaohongshu', color: '#FF2442' },
  douyin:       { label: 'Douyin',       color: '#161823' },
  bilibili:     { label: 'Bilibili',     color: '#00AEEC' },
  youtube:      { label: 'YouTube',      color: '#FF0000' },
  instagram:    { label: 'Instagram',    color: '#E1306C' },
  tiktok:       { label: 'TikTok',       color: '#010101' },
};

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  return null;
}

function getDisplayDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function showState(id) {
  for (const s of ['setup-state', 'clip-state', 'success-state', 'error-state']) {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  }
}

function showError(msg) {
  document.getElementById('error-msg-text').textContent = msg;
  showState('error-state');
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => resolve(result.appUrl || ''));
  });
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

function renderClipState(tab, appUrl) {
  const titleEl = document.getElementById('page-title');
  const urlEl   = document.getElementById('page-url');
  const favicon  = document.getElementById('page-favicon');
  const faviconFallback = document.getElementById('page-favicon-fallback');
  const platformTag = document.getElementById('platform-tag');

  titleEl.textContent = tab.title || '(no title)';
  urlEl.textContent   = getDisplayDomain(tab.url);

  if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
    favicon.src = tab.favIconUrl;
    favicon.onload = () => {
      favicon.classList.remove('hidden');
      faviconFallback.classList.add('hidden');
    };
    favicon.onerror = () => {
      favicon.classList.add('hidden');
      faviconFallback.classList.remove('hidden');
    };
  } else {
    favicon.classList.add('hidden');
    faviconFallback.classList.remove('hidden');
  }

  const platform = detectPlatform(tab.url);
  if (platform && PLATFORM_CONFIG[platform]) {
    const cfg = PLATFORM_CONFIG[platform];
    platformTag.textContent = cfg.label;
    platformTag.style.background = cfg.color;
    platformTag.classList.remove('hidden');
  } else {
    platformTag.classList.add('hidden');
  }

  document.getElementById('clip-btn').onclick = () => doClip(tab, appUrl);
  document.getElementById('open-app-btn').onclick = () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  };
}

function doClip(tab, appUrl) {
  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
  showState('success-state');
  setTimeout(() => {
    chrome.tabs.create({ url: shareUrl });
    window.close();
  }, 600);
}

// Setup form
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('save-setup-btn').addEventListener('click', async () => {
  const input = document.getElementById('setup-url-input');
  const errorEl = document.getElementById('setup-error');
  let url = input.value.trim();

  if (!url) {
    errorEl.textContent = 'Please enter your TravelPanel URL.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Normalize: ensure https:// prefix
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/\/$/, '');

  try {
    new URL(url);
  } catch {
    errorEl.textContent = 'That doesn\'t look like a valid URL.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');

  await new Promise((resolve) => chrome.storage.sync.set({ appUrl: url }, resolve));

  const tab = await getCurrentTab();
  if (tab) {
    renderClipState(tab, url);
    showState('clip-state');
  }
});

document.getElementById('retry-btn').addEventListener('click', async () => {
  init();
});

async function init() {
  const appUrl = await getAppUrl();

  if (!appUrl) {
    showState('setup-state');
    return;
  }

  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.url) {
      showError('Cannot read the current tab. Try refreshing the page.');
      return;
    }

    // Block extension pages and Chrome internals
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      showError('TravelPanel Clipper can\'t clip browser internal pages. Navigate to a travel website first!');
      return;
    }

    renderClipState(tab, appUrl);
    showState('clip-state');
  } catch (err) {
    showError('Could not access tab information. ' + (err.message || ''));
  }
}

init();
