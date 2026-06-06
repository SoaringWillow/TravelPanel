// TravelPanel Clipper — popup.js

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  instagram: 'Instagram',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  youtube: '#FF0000',
  instagram: '#E1306C',
  other: '#6366F1',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

document.addEventListener('DOMContentLoaded', async () => {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('open-setup-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  if (!appUrl) {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('setup-view').style.display = 'block';
    return;
  }

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || '';
  const title = tab.title || 'Untitled page';

  // Platform detection
  const platform = detectPlatform(url);
  const chip = document.getElementById('platform-chip');
  chip.textContent = PLATFORM_LABELS[platform];
  chip.style.backgroundColor = PLATFORM_COLORS[platform];

  // Page info
  document.getElementById('page-title').textContent = title;
  const urlEl = document.getElementById('page-url');
  try {
    urlEl.textContent = new URL(url).hostname;
  } catch {
    urlEl.textContent = url.slice(0, 60);
  }

  // Clip button
  const clipBtn = document.getElementById('clip-btn');
  const clipLabel = document.getElementById('clip-btn-label');
  const isClippable = url.startsWith('http://') || url.startsWith('https://');

  if (!isClippable) {
    clipBtn.disabled = true;
    clipLabel.textContent = 'Not a clippable page';
    return;
  }

  clipBtn.addEventListener('click', () => {
    const base = appUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });
});
