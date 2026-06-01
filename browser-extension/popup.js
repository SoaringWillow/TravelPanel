'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const PLATFORM_PATTERNS = [
  { pattern: /instagram\.com/i,     label: 'Instagram',    cls: 'instagram' },
  { pattern: /youtube\.com|youtu\.be/i, label: 'YouTube',  cls: 'youtube' },
  { pattern: /xiaohongshu\.com|xhslink\.com/i, label: 'Xiaohongshu', cls: 'xiaohongshu' },
  { pattern: /tiktok\.com/i,        label: 'TikTok',       cls: 'tiktok' },
];

function detectPlatform(url) {
  for (const { pattern, label, cls } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { label, cls };
  }
  return { label: 'Web', cls: 'other' };
}

function truncateUrl(url, maxLen = 50) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > maxLen ? short.slice(0, maxLen) + '…' : short;
  } catch {
    return url.slice(0, maxLen);
  }
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (items) => {
      resolve(items.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const titleEl   = document.getElementById('pageTitle');
  const urlEl     = document.getElementById('pageUrl');
  const badgeEl   = document.getElementById('platformBadge');
  const saveBtn   = document.getElementById('saveBtn');
  const openBtn   = document.getElementById('openAppBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const successEl = document.getElementById('successState');
  const errorEl   = document.getElementById('errorState');
  const errorText = document.getElementById('errorText');
  const faviconEl = document.getElementById('pageFavicon');

  const appUrl = await getAppUrl();

  // Open app button
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Query active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showError('Could not access the current tab.');
    return;
  }

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    showError('Cannot clip browser internal pages.');
    return;
  }

  const pageTitle = tab.title || 'Untitled';
  const pageUrl   = tab.url;

  // Render favicon
  try {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=32`;
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = '';
    img.onerror = () => { /* keep default SVG */ };
    faviconEl.innerHTML = '';
    faviconEl.appendChild(img);
  } catch { /* keep default icon */ }

  // Populate preview
  titleEl.textContent = pageTitle;
  urlEl.textContent   = truncateUrl(pageUrl);

  // Platform badge
  const { label, cls } = detectPlatform(pageUrl);
  badgeEl.textContent = label;
  badgeEl.className = `platform-badge ${cls}`;
  if (label !== 'Web') badgeEl.classList.remove('hidden');

  // Enable save button
  saveBtn.disabled = false;

  saveBtn.addEventListener('click', async () => {
    saveBtn.classList.add('hidden');
    successEl.classList.remove('hidden');

    const shareUrl = new URL('/share', appUrl);
    shareUrl.searchParams.set('url', pageUrl);
    shareUrl.searchParams.set('title', pageTitle);
    shareUrl.searchParams.set('source', 'extension');

    // Open TravelPanel share page in a new tab (or focus existing one)
    chrome.tabs.create({ url: shareUrl.toString() });

    setTimeout(() => window.close(), 800);
  });

  function showError(msg) {
    errorText.textContent = msg;
    errorEl.classList.remove('hidden');
    saveBtn.disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', init);
