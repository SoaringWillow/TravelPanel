'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const PLATFORM_LABELS = {
  'instagram.com':      { label: 'Instagram', emoji: '📸' },
  'youtube.com':        { label: 'YouTube',   emoji: '▶️' },
  'youtu.be':           { label: 'YouTube',   emoji: '▶️' },
  'xiaohongshu.com':    { label: '小红书',     emoji: '📕' },
  'xhslink.com':        { label: '小红书',     emoji: '📕' },
  'douyin.com':         { label: '抖音',       emoji: '🎵' },
  'tiktok.com':         { label: 'TikTok',    emoji: '🎵' },
  'bilibili.com':       { label: 'Bilibili',  emoji: '📺' },
  'twitter.com':        { label: 'Twitter',   emoji: '🐦' },
  'x.com':              { label: 'X',         emoji: '🐦' },
  'pinterest.com':      { label: 'Pinterest', emoji: '📌' },
  'maps.google.com':    { label: 'Google Maps', emoji: '🗺️' },
  'tripadvisor.com':    { label: 'TripAdvisor', emoji: '✈️' },
};

function detectPlatform(hostname) {
  for (const [domain, info] of Object.entries(PLATFORM_LABELS)) {
    if (hostname.endsWith(domain) || hostname === domain) return info;
  }
  return null;
}

async function getAppUrl() {
  const result = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return result.appUrl.replace(/\/$/, '');
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(msg, type = '') {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = type;
}

async function init() {
  const tab = await getCurrentTab();

  // Populate title
  const titleEl = document.getElementById('pageTitle');
  titleEl.textContent = tab.title || 'Untitled page';

  // Populate URL
  const urlEl = document.getElementById('pageUrl');
  let hostname = '';
  try {
    const u = new URL(tab.url || '');
    hostname = u.hostname;
    urlEl.textContent = hostname + u.pathname.slice(0, 40) + (u.pathname.length > 40 ? '…' : '');
  } catch {
    urlEl.textContent = tab.url || '';
  }

  // Favicon
  const faviconEl = document.getElementById('favicon');
  const fallbackEl = document.getElementById('faviconFallback');
  if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
    fallbackEl.style.display = 'none';
  }

  // Platform badge
  const platform = detectPlatform(hostname);
  if (platform) {
    const badge = document.getElementById('platformBadge');
    badge.textContent = `${platform.emoji} ${platform.label}`;
    badge.style.display = 'inline-flex';
  }

  // Block internal pages
  const isInternal = !tab.url
    || tab.url.startsWith('chrome://')
    || tab.url.startsWith('chrome-extension://')
    || tab.url.startsWith('about:')
    || tab.url.startsWith('edge://');

  if (isInternal) {
    document.getElementById('clipBtn').disabled = true;
    setStatus('Cannot clip browser internal pages.', 'error');
  }

  // Pre-load app URL for the open link
  const appUrl = await getAppUrl();
  const openLink = document.getElementById('openAppLink');
  openLink.href = appUrl;
  openLink.style.display = 'inline';
  openLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

document.getElementById('clipBtn').addEventListener('click', async () => {
  const btn = document.getElementById('clipBtn');
  const btnText = document.getElementById('btnText');
  const btnIcon = document.getElementById('btnIcon');

  const tab = await getCurrentTab();
  const appUrl = await getAppUrl();

  if (!tab.url) {
    setStatus('No URL found on this page.', 'error');
    return;
  }

  // Loading state
  btn.classList.add('loading');
  btn.disabled = true;
  btnText.textContent = 'Opening TravelPanel…';
  btnIcon.innerHTML = `
    <circle cx="10" cy="10" r="7" stroke="white" stroke-width="2" fill="none" stroke-dasharray="22" stroke-dashoffset="22">
      <animate attributeName="stroke-dashoffset" values="22;0" dur="0.6s" fill="freeze"/>
    </circle>`;

  const importUrl = `${appUrl}/?import=${encodeURIComponent(tab.url)}`;

  try {
    await chrome.tabs.create({ url: importUrl });

    // Success state
    btn.classList.remove('loading');
    btn.classList.add('success');
    btnText.textContent = 'Clipped!';
    btnIcon.innerHTML = `
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" fill="white"/>`;
    setStatus('TravelPanel is processing this page.', 'success');

    setTimeout(() => window.close(), 1000);
  } catch (err) {
    btn.classList.remove('loading');
    btn.disabled = false;
    btnText.textContent = 'Save to TravelPanel';
    setStatus('Failed to open TravelPanel. Check settings.', 'error');
  }
});

document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

init();
