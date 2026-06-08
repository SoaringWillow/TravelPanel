'use strict';

const PLATFORM_META = {
  xiaohongshu: { label: '小红书',   emoji: '📕', cls: 'badge-xiaohongshu' },
  youtube:     { label: 'YouTube',   emoji: '▶️',  cls: 'badge-youtube'     },
  instagram:   { label: 'Instagram', emoji: '📸', cls: 'badge-instagram'    },
  wechat:      { label: 'WeChat',    emoji: '💬', cls: 'badge-wechat'       },
  douyin:      { label: 'Douyin',    emoji: '🎵', cls: 'badge-douyin'       },
  other:       { label: 'Web',       emoji: '🌐', cls: 'badge-other'        },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/xiaohongshu\.com|xhslink\.com/.test(url))  return 'xiaohongshu';
  if (/youtube\.com|youtu\.be/.test(url))          return 'youtube';
  if (/instagram\.com/.test(url))                  return 'instagram';
  if (/mp\.weixin\.qq\.com/.test(url))             return 'wechat';
  if (/douyin\.com|tiktok\.com/.test(url))         return 'douyin';
  return 'other';
}

function isBrowserInternalUrl(url) {
  return /^(chrome|chrome-extension|edge|about|moz-extension|safari-web-extension):\/\//.test(url);
}

document.addEventListener('DOMContentLoaded', async () => {
  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');

  // ── Settings button always works ──
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Not configured → show setup screen ──
  if (!travelPanelUrl) {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    document.getElementById('setup-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  const baseUrl = travelPanelUrl.replace(/\/$/, '');

  // ── Get current tab ──
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl   = tab?.url   ?? '';
  const pageTitle = tab?.title ?? '';

  // ── Populate page info ──
  document.getElementById('page-title').textContent = pageTitle || 'Untitled page';
  document.getElementById('page-url').textContent   = pageUrl;

  const platform = detectPlatform(pageUrl);
  const meta     = PLATFORM_META[platform] ?? PLATFORM_META.other;
  const badge    = document.createElement('span');
  badge.className = `platform-badge ${meta.cls}`;
  badge.textContent = `${meta.emoji} ${meta.label}`;
  document.getElementById('platform-badge-wrap').appendChild(badge);

  // ── Clip button ──
  const clipBtn = document.getElementById('clip-btn');

  if (isBrowserInternalUrl(pageUrl)) {
    clipBtn.disabled = true;
    clipBtn.innerHTML = '⚠️ Cannot clip this page';
  } else {
    clipBtn.addEventListener('click', () => {
      const shareUrl = new URL('/share', baseUrl);
      shareUrl.searchParams.set('url', pageUrl);
      if (pageTitle) shareUrl.searchParams.set('title', pageTitle);
      chrome.tabs.create({ url: shareUrl.toString() });
      window.close();
    });
  }

  // ── Open app ──
  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: baseUrl });
    window.close();
  });
});
