/* global chrome */
'use strict';

const DEFAULT_URL = 'http://localhost:3000';

const PLATFORM_MAP = [
  [/instagram\.com/,          'instagram',   'Instagram'],
  [/youtube\.com|youtu\.be/,  'youtube',     'YouTube'],
  [/tiktok\.com/,             'tiktok',      'TikTok'],
  [/xiaohongshu\.com|xhslink\.com/, 'xiaohongshu', '小红书'],
  [/douyin\.com/,             'douyin',      '抖音'],
  [/twitter\.com|x\.com/,     'twitter',     'X / Twitter'],
  [/bilibili\.com/,           'bilibili',    'Bilibili'],
];

function detectPlatform(url) {
  for (const [regex, id, label] of PLATFORM_MAP) {
    if (regex.test(url)) return { id, label };
  }
  return { id: 'web', label: null };
}

function truncateUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    const path = pathname.length > 30 ? pathname.slice(0, 28) + '…' : pathname;
    return `${host}${path}`;
  } catch {
    return url.length > 50 ? url.slice(0, 48) + '…' : url;
  }
}

function isUnsupportedPage(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('moz-extension://')
  );
}

async function init() {
  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl');

  const titleEl        = document.getElementById('page-title');
  const urlEl          = document.getElementById('page-url');
  const faviconEl      = document.getElementById('page-favicon');
  const platformBadge  = document.getElementById('platform-badge');
  const saveBtn        = document.getElementById('save-btn');
  const statusEl       = document.getElementById('status');
  const openAppLink    = document.getElementById('open-app');

  // Wire footer "Open TravelPanel" link
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: travelPanelUrl });
    window.close();
  });

  // Wire settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl   = tab?.url   ?? '';
  const currentTitle = tab?.title ?? '';
  const faviconUrl   = tab?.favIconUrl ?? '';

  // Populate preview card
  titleEl.textContent = currentTitle || 'Untitled page';
  urlEl.textContent   = truncateUrl(currentUrl);

  if (faviconUrl) {
    const img    = document.createElement('img');
    img.src      = faviconUrl;
    img.alt      = '';
    img.className = 'favicon';
    img.onerror  = () => { /* keep placeholder */ };
    faviconEl.replaceWith(img);
  }

  const { id: platformId, label: platformLabel } = detectPlatform(currentUrl);
  if (platformLabel) {
    platformBadge.textContent  = platformLabel;
    platformBadge.className    = `platform-badge ${platformId}`;
    platformBadge.style.display = 'inline-flex';
  }

  // Handle unsupported pages
  if (isUnsupportedPage(currentUrl)) {
    saveBtn.disabled = true;
    statusEl.textContent = 'This page cannot be saved';
    statusEl.className   = 'status error';
    return;
  }

  // Enable save button
  saveBtn.disabled = false;

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner"></div> Opening TravelPanel…';
    statusEl.textContent = '';
    statusEl.className   = 'status';

    const base     = travelPanelUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;

    try {
      // If TravelPanel is already open somewhere, reuse that tab
      const existing = await chrome.tabs.query({ url: `${base}/*` });

      if (existing.length > 0) {
        await chrome.tabs.update(existing[0].id, { url: shareUrl, active: true });
        if (existing[0].windowId) {
          await chrome.windows.update(existing[0].windowId, { focused: true });
        }
      } else {
        await chrome.tabs.create({ url: shareUrl });
      }

      statusEl.textContent = '✓ Opened in TravelPanel';
      statusEl.className   = 'status success';
      setTimeout(() => window.close(), 900);
    } catch (err) {
      console.error('[TravelPanel] Save failed:', err);
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1z" clip-rule="evenodd"/>
        </svg>
        Save to TravelPanel`;
      statusEl.textContent = 'Something went wrong — check your settings';
      statusEl.className   = 'status error';
    }
  });
}

init().catch((err) => {
  console.error('[TravelPanel] Popup init error:', err);
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = 'Extension error — please reload';
    statusEl.className   = 'status error';
  }
});
