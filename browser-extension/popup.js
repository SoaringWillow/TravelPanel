'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// URLs that can't be clipped (browser internals, extension pages, etc.)
const UNCLIPPABLE_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'safari-web-extension://',
  'about:',
  'edge://',
  'opera://',
];

function isClippable(url) {
  if (!url) return false;
  return !UNCLIPPABLE_PREFIXES.some(prefix => url.startsWith(prefix));
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    let display = u.hostname + u.pathname;
    if (display.length > 52) display = display.slice(0, 49) + '…';
    return display;
  } catch {
    return url.slice(0, 52);
  }
}

function getFaviconUrl(pageUrl) {
  try {
    const u = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

function showStatus(type, message) {
  const el = document.getElementById('status');
  el.className = `status ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

async function init() {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showStatus('error', 'Could not access the current tab.');
    return;
  }

  const url = tab.url || '';
  const title = tab.title || 'Untitled';

  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const clipBtn = document.getElementById('clip-btn');
  const pageInfoEl = document.getElementById('page-info');
  const unsupportedEl = document.getElementById('unsupported');
  const faviconEl = document.getElementById('page-favicon');

  if (!isClippable(url)) {
    titleEl.textContent = title;
    urlEl.textContent = truncateUrl(url);
    pageInfoEl.classList.add('hidden');
    unsupportedEl.classList.remove('hidden');
    clipBtn.disabled = true;
    return;
  }

  // Populate page info
  titleEl.textContent = title;
  urlEl.textContent = truncateUrl(url);

  // Load favicon
  const faviconUrl = getFaviconUrl(url);
  if (faviconUrl) {
    faviconEl.src = faviconUrl;
    faviconEl.onload = () => faviconEl.classList.add('loaded');
  }

  // Clip button
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = 'Opening…';

    const appUrl = await getAppUrl();
    const shareUrl =
      appUrl.replace(/\/$/, '') +
      '/share?url=' + encodeURIComponent(url) +
      '&title=' + encodeURIComponent(title);

    try {
      await chrome.tabs.create({ url: shareUrl });
      window.close();
    } catch {
      showStatus('error', 'Failed to open TravelPanel. Check your app URL in settings.');
      clipBtn.disabled = false;
      clipBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        Save to TravelPanel
      `;
    }
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

init();
