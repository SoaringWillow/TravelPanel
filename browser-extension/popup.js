// Platform detection (mirrors lib/parse-url.ts)
function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: null,
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366f1',
};

const DEFAULT_APP_URL = 'http://localhost:3000';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get('appUrl', ({ appUrl }) => {
      resolve(appUrl || DEFAULT_APP_URL);
    });
  });
}

function showStatus(message, isError = false) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = 'status visible' + (isError ? ' error' : '');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showStatus('Unable to read current tab.', true);
    return;
  }

  const url = tab.url || '';
  const title = tab.title || url;

  // Fill in preview
  document.getElementById('page-title').textContent = title || 'Untitled page';
  document.getElementById('page-url').textContent = url;

  // Platform badge
  const platform = detectPlatform(url);
  const platformLabel = PLATFORM_LABELS[platform];
  if (platformLabel) {
    const badge = document.getElementById('platform-badge');
    badge.textContent = platformLabel;
    badge.style.backgroundColor = PLATFORM_COLORS[platform];
    badge.style.display = 'block';
  }

  // Show configured app URL in footer
  const appUrl = await getAppUrl();
  const footerEl = document.getElementById('footer-app-url');
  try {
    footerEl.textContent = new URL(appUrl).hostname;
  } catch {
    footerEl.textContent = appUrl;
  }

  // Disable clip button for non-http pages (chrome://, about:, etc.)
  const clipBtn = document.getElementById('clip-btn');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    clipBtn.disabled = true;
    clipBtn.title = 'Cannot clip browser internal pages';
    document.getElementById('page-title').textContent = 'Navigate to a travel page to clip it';
    document.getElementById('page-url').textContent = '';
  }

  // Clip button: open /share in the app
  clipBtn.addEventListener('click', async () => {
    const currentAppUrl = await getAppUrl();
    const params = new URLSearchParams({ url, title });
    const shareUrl = `${currentAppUrl}/share?${params.toString()}`;

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // Open app button
  document.getElementById('open-app-btn').addEventListener('click', async () => {
    const currentAppUrl = await getAppUrl();
    chrome.tabs.create({ url: currentAppUrl });
    window.close();
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
