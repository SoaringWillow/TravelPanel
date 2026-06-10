// Platform detection — mirrors lib/parse-url.ts logic
const PLATFORMS = {
  xiaohongshu: {
    label: 'Xiaohongshu', color: '#ff2442', bg: '#fff0f2', emoji: '📕',
    test: (u) => u.includes('xiaohongshu.com') || u.includes('xhslink.com'),
  },
  instagram: {
    label: 'Instagram', color: '#e1306c', bg: '#fff0f5', emoji: '📸',
    test: (u) => u.includes('instagram.com'),
  },
  youtube: {
    label: 'YouTube', color: '#ff0000', bg: '#fff0f0', emoji: '▶️',
    test: (u) => u.includes('youtube.com') || u.includes('youtu.be'),
  },
  douyin: {
    label: 'Douyin / TikTok', color: '#010101', bg: '#f0f0f0', emoji: '🎵',
    test: (u) => u.includes('douyin.com') || u.includes('tiktok.com'),
  },
  bilibili: {
    label: 'Bilibili', color: '#00a1d6', bg: '#f0faff', emoji: '📺',
    test: (u) => u.includes('bilibili.com'),
  },
  wechat: {
    label: 'WeChat', color: '#07c160', bg: '#f0fff5', emoji: '💬',
    test: (u) => u.includes('weixin.qq.com') || u.includes('mp.weixin.qq.com'),
  },
};

function detectPlatform(url) {
  for (const [key, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.test(url)) return { key, ...cfg };
  }
  return { key: 'other', label: 'Web', color: '#64748b', bg: '#f1f5f9', emoji: '🌐' };
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, (items) => resolve(items.appUrl || ''));
  });
}

async function init() {
  const appUrl = await getAppUrl();

  if (!appUrl) {
    document.getElementById('not-configured').style.display = 'block';
    document.getElementById('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || '';

  // Bail on browser-internal pages
  if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('edge://')) {
    document.getElementById('not-configured').style.display = 'block';
    document.getElementById('open-options').style.display = 'none';
    document.querySelector('.setup-icon').textContent = '🚫';
    document.querySelector('.setup-title').textContent = 'Not a web page';
    document.querySelector('.setup-desc').textContent =
      'Navigate to any travel blog, Instagram, YouTube, or Xiaohongshu post to clip it.';
    return;
  }

  const platform = detectPlatform(url);

  // Populate UI
  const badge = document.getElementById('platform-badge');
  badge.textContent = `${platform.emoji} ${platform.label}`;
  badge.style.background = platform.bg;
  badge.style.color      = platform.color;

  document.getElementById('page-title').textContent = title || 'Untitled page';
  document.getElementById('page-url').textContent   = url;
  document.getElementById('main-content').style.display = 'block';

  // Clip button — opens /share with url + title query params
  document.getElementById('clip-btn').addEventListener('click', () => {
    const base     = appUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // Settings link
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

init().catch((err) => {
  console.error('[TravelPanel Clipper]', err);
  document.getElementById('not-configured').style.display = 'block';
  document.querySelector('.setup-title').textContent = 'Something went wrong';
  document.querySelector('.setup-desc').textContent  = err.message;
});
