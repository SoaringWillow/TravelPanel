const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = {
  'instagram.com': { label: 'Instagram', color: '#E1306C' },
  'youtube.com': { label: 'YouTube', color: '#FF0000' },
  'youtu.be': { label: 'YouTube', color: '#FF0000' },
  'xiaohongshu.com': { label: '小红书', color: '#FF2442' },
  'xhslink.com': { label: '小红书', color: '#FF2442' },
  'tiktok.com': { label: 'TikTok', color: '#161823' },
  'douyin.com': { label: '抖音', color: '#161823' },
  'bilibili.com': { label: 'Bilibili', color: '#00A1D6' },
  'twitter.com': { label: 'Twitter', color: '#1DA1F2' },
  'x.com': { label: 'X / Twitter', color: '#000000' },
  'reddit.com': { label: 'Reddit', color: '#FF4500' },
  'weibo.com': { label: '微博', color: '#E6162D' },
  'pinterest.com': { label: 'Pinterest', color: '#E60023' },
  'tripadvisor.com': { label: 'TripAdvisor', color: '#34E0A1' },
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (hostname.includes(domain)) return info;
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '');
  } catch {
    return url.slice(0, 50);
  }
}

async function init() {
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const faviconEl = document.getElementById('favicon');
  const platformEl = document.getElementById('platform-badge');
  const clipBtn = document.getElementById('clip-btn');
  const hintEl = document.getElementById('hint');
  const statusEl = document.getElementById('status-msg');

  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    titleEl.textContent = 'Unable to read current tab';
    clipBtn.disabled = true;
    return;
  }

  const [tab] = tabs;
  if (!tab) {
    titleEl.textContent = 'No active tab found';
    clipBtn.disabled = true;
    return;
  }

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

  const url = tab.url || '';
  const title = tab.title || 'Untitled page';

  // Populate page info
  titleEl.textContent = title;
  urlEl.textContent = truncateUrl(url);

  // Favicon
  if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
    faviconEl.onerror = () => { faviconEl.style.display = 'none'; };
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    platformEl.textContent = platform.label;
    platformEl.style.background = platform.color;
    platformEl.style.display = 'inline-block';
  }

  // Disable clip for non-http pages
  if (!url.startsWith('http')) {
    clipBtn.disabled = true;
    clipBtn.querySelector('span').textContent = 'Cannot clip this page';
    hintEl.style.display = 'none';
    statusEl.textContent = 'Extensions can only clip http/https pages.';
    statusEl.className = 'status-msg';
    statusEl.style.display = 'block';
    return;
  }

  // Clip button action
  clipBtn.addEventListener('click', () => {
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
