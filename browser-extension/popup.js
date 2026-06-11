'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_LABELS = {
  youtube:      '▶ YouTube',
  instagram:    '📸 Instagram',
  xiaohongshu:  '🌸 小红书',
  douyin:       '🎵 抖音',
  bilibili:     '📺 Bilibili',
  tiktok:       '🎵 TikTok',
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com'))   return 'instagram';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return 'xiaohongshu';
    if (host.includes('douyin.com'))      return 'douyin';
    if (host.includes('bilibili.com'))    return 'bilibili';
    if (host.includes('tiktok.com'))      return 'tiktok';
  } catch {}
  return null;
}

function getDisplayHost(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '') + (u.pathname.length > 1 ? u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '') : '');
  } catch {
    return url.slice(0, 50);
  }
}

function getFaviconUrl(url) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
  } catch {
    return null;
  }
}

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.style.display = 'block';
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, data => {
      resolve(data.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const titleEl  = document.getElementById('page-title');
  const urlEl    = document.getElementById('page-url');
  const faviconEl = document.getElementById('favicon');
  const faviconFallback = document.getElementById('favicon-fallback');
  const platformRow  = document.getElementById('platform-row');
  const platformBadge = document.getElementById('platform-badge');
  const saveBtn  = document.getElementById('save-btn');

  // Loading state
  titleEl.classList.add('skeleton');
  titleEl.textContent = 'Loading page info…';

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    titleEl.classList.remove('skeleton');
    titleEl.textContent = 'Cannot access this page';
    setStatus('This extension only works on regular web pages.', 'error');
    return;
  }

  const url = tab.url || '';
  const title = tab.title || '';

  // Reject extension/chrome internal pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('moz-extension://') || url.startsWith('about:') ||
      url.startsWith('edge://')) {
    titleEl.classList.remove('skeleton');
    titleEl.textContent = 'System page';
    urlEl.textContent = url;
    setStatus('Navigate to a travel post or destination page to clip it.', 'info');
    return;
  }

  // Populate card
  titleEl.classList.remove('skeleton');
  titleEl.textContent = title || 'Untitled page';
  urlEl.textContent   = getDisplayHost(url);
  titleEl.title       = title;
  urlEl.title         = url;

  // Favicon
  const faviconUrl = getFaviconUrl(url);
  if (faviconUrl) {
    faviconEl.onload  = () => { faviconEl.style.display = 'block'; faviconFallback.style.display = 'none'; };
    faviconEl.onerror = () => { faviconEl.style.display = 'none'; faviconFallback.style.display = 'flex'; };
    faviconEl.src = faviconUrl;
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform && PLATFORM_LABELS[platform]) {
    platformBadge.textContent = PLATFORM_LABELS[platform];
    platformBadge.className   = `platform-badge ${platform}`;
    platformRow.style.display = 'block';
  }

  // Enable save button
  saveBtn.disabled = false;

  // Save button click → open share page in TravelPanel
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    try {
      await chrome.tabs.create({ url: shareUrl });
      // Show brief success state before closing
      saveBtn.classList.add('saved');
      saveBtn.querySelector('.btn-text').textContent = 'Opening TravelPanel…';
      setTimeout(() => window.close(), 800);
    } catch (err) {
      saveBtn.disabled = false;
      setStatus(`Could not open TravelPanel. Check settings → app URL.`, 'error');
    }
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
