'use strict';

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  tripadvisor: 'TripAdvisor',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  youtube: '#FF0000',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  tripadvisor: '#34E0A1',
  other: '#4f46e5',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('tripadvisor.com')) return 'tripadvisor';
  return 'other';
}

function show(id) {
  ['state-loading', 'state-not-configured', 'state-ready', 'state-success'].forEach((s) => {
    document.getElementById(s).style.display = s === id ? '' : 'none';
  });
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || '');
    });
  });
}

async function init() {
  show('state-loading');

  const appUrl = await getAppUrl();
  if (!appUrl) {
    show('state-not-configured');
    return;
  }

  let tab;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  } catch {
    show('state-not-configured');
    return;
  }

  const url = tab?.url || '';
  const title = tab?.title || url;
  const platform = detectPlatform(url);
  const color = PLATFORM_COLORS[platform] || PLATFORM_COLORS.other;
  const label = PLATFORM_LABELS[platform] || 'Web';

  // Populate page card
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-url').textContent = url.replace(/^https?:\/\//, '').slice(0, 60);

  // Favicon
  const faviconWrap = document.getElementById('favicon-wrap');
  const origin = url ? new URL(url).origin : '';
  if (origin) {
    const img = document.createElement('img');
    img.src = `${origin}/favicon.ico`;
    img.alt = '';
    img.onerror = () => img.remove();
    img.onload = () => {
      document.getElementById('favicon-fallback').style.display = 'none';
    };
    faviconWrap.appendChild(img);
  }

  // Platform badge
  const badge = document.getElementById('platform-badge');
  badge.style.backgroundColor = color;
  document.getElementById('platform-label').textContent = label;

  // Clip button
  document.getElementById('btn-clip').addEventListener('click', () => {
    const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    show('state-success');
    setTimeout(() => window.close(), 1200);
  });

  show('state-ready');
}

// Wire up buttons
document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('btn-footer-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('btn-configure-main').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('btn-open-app').addEventListener('click', async () => {
  const appUrl = await getAppUrl();
  if (appUrl) chrome.tabs.create({ url: appUrl });
  else chrome.runtime.openOptionsPage();
});

init();
