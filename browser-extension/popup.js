'use strict';

const PLATFORM_META = {
  wechat:      { label: '💬 WeChat',      color: '#07C160' },
  xiaohongshu: { label: '📖 小红书',       color: '#FF2442' },
  douyin:      { label: '🎵 Douyin',      color: '#161823' },
  bilibili:    { label: '📺 Bilibili',    color: '#00AEEC' },
  other:       { label: '🌐 Web',         color: '#6366F1' },
};

function detectPlatform(url) {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

function show(id) {
  document.getElementById(id).classList.remove('hidden');
}

async function init() {
  // Settings button always works
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');

  if (!travelpanelUrl) {
    show('noConfigView');
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  const pageUrl   = tab.url   || '';
  const pageTitle = tab.title || pageUrl;
  const platform  = detectPlatform(pageUrl);
  const meta      = PLATFORM_META[platform];

  const badge = document.getElementById('platformBadge');
  badge.textContent = meta.label;
  badge.style.background = meta.color;

  document.getElementById('pageTitle').textContent = pageTitle;
  document.getElementById('pageUrl').textContent   = pageUrl;

  show('mainView');

  document.getElementById('clipBtn').addEventListener('click', () => {
    const base     = travelpanelUrl.replace(/\/+$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    // Show success flash then open share page
    document.getElementById('mainView').classList.add('hidden');
    show('successView');

    setTimeout(() => {
      chrome.tabs.create({ url: shareUrl });
      window.close();
    }, 700);
  });
}

init().catch(err => {
  console.error('[TravelPanel] popup error:', err);
});
