'use strict';

const PLATFORM_PATTERNS = [
  { pattern: /weixin\.qq\.com|mp\.weixin/i,           label: '💬 WeChat' },
  { pattern: /xiaohongshu\.com|xhslink\.com|xhs\.link/i, label: '📕 Xiaohongshu' },
  { pattern: /douyin\.com|iesdouyin\.com/i,           label: '🎵 Douyin' },
  { pattern: /tiktok\.com/i,                          label: '🎵 TikTok' },
  { pattern: /bilibili\.com|b23\.tv/i,                label: '📺 Bilibili' },
  { pattern: /instagram\.com/i,                       label: '📸 Instagram' },
  { pattern: /youtube\.com|youtu\.be/i,               label: '▶️ YouTube' },
];

function detectPlatform(url) {
  for (const { pattern, label } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return label;
  }
  return null;
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: 'http://localhost:3000' }, data => {
      resolve(data.appUrl.replace(/\/$/, ''));
    });
  });
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '') : '');
  } catch {
    return url.slice(0, 40);
  }
}

async function init() {
  const appUrl = await getAppUrl();

  // Wire settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Wire open-app button
  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  // Get current tab info
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    setError('Could not read current tab.');
    return;
  }

  const url = tab?.url ?? '';
  const title = tab?.title ?? '';
  const isClippable = url.startsWith('http://') || url.startsWith('https://');

  // Update page info
  document.getElementById('page-title').textContent = title || 'Untitled page';
  document.getElementById('page-url').textContent = truncateUrl(url);

  // Favicon
  if (tab?.favIconUrl) {
    const faviconEl = document.getElementById('page-favicon');
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.alt = '';
    img.onerror = () => img.remove();
    faviconEl.innerHTML = '';
    faviconEl.appendChild(img);
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    const badge = document.getElementById('platform-badge');
    badge.style.display = 'inline-flex';
    document.getElementById('platform-label').textContent = platform;
  }

  // Clip button state
  const clipBtn = document.getElementById('clip-btn');
  const clipLabel = document.getElementById('clip-btn-label');

  if (!isClippable) {
    clipLabel.textContent = 'Not a web page';
    return; // button stays disabled
  }

  clipBtn.disabled = false;

  clipBtn.addEventListener('click', () => {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });

    // Success feedback
    clipBtn.classList.add('success');
    clipBtn.disabled = true;
    clipBtn.querySelector('.btn-icon').innerHTML = `
      <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    `.replace('<polyline', '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><polyline').replace('</polyline>', '</polyline></svg>');
    clipLabel.textContent = 'Opening TravelPanel…';

    setTimeout(() => window.close(), 900);
  });
}

init().catch(err => {
  document.getElementById('clip-btn-label').textContent = 'Error — check console';
  console.error('[TravelPanel extension]', err);
});
