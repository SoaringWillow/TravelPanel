'use strict';

const STORAGE_KEY = 'travelpanel_url';

// Protocols that can't be clipped (browser-internal pages)
const RESTRICTED_PROTOCOLS = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'brave:', 'moz-extension:'];

async function getStoredUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || '');
    });
  });
}

function isRestricted(url) {
  if (!url) return true;
  try {
    const { protocol } = new URL(url);
    return RESTRICTED_PROTOCOLS.includes(protocol);
  } catch {
    return true;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tpUrl = await getStoredUrl();

  const pageUrl   = tab?.url   || '';
  const pageTitle = tab?.title || 'Untitled page';
  const domain    = pageUrl ? getDomain(pageUrl) : '';
  const restricted = isRestricted(pageUrl);

  // Update page preview
  const titleEl  = document.getElementById('page-title');
  const urlEl    = document.getElementById('page-url');
  const domainEl = document.getElementById('domain-text');
  const favicon  = document.getElementById('favicon');

  titleEl.textContent = pageTitle;
  titleEl.classList.remove('loading');
  urlEl.textContent   = pageUrl;
  domainEl.textContent = domain;

  if (domain) {
    favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;
    favicon.style.display = 'inline';
  }

  const clipBtn     = document.getElementById('clip-btn');
  const clipBtnText = document.getElementById('clip-btn-text');
  const setupBanner = document.getElementById('setup-banner');
  const restrictMsg = document.getElementById('restricted-msg');

  if (restricted) {
    restrictMsg.style.display = 'block';
    document.getElementById('page-preview').style.display = 'none';
    clipBtn.style.display = 'none';
  } else if (!tpUrl) {
    setupBanner.style.display = 'flex';
    clipBtn.disabled = true;
  } else {
    clipBtn.disabled = false;
  }

  // ── Clip button ────────────────────────────────────────────────────────────

  clipBtn.addEventListener('click', async () => {
    const base = (await getStoredUrl()).replace(/\/$/, '');
    if (!base || !pageUrl) return;

    const shareUrl = `${base}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    clipBtn.disabled = true;
    clipBtnText.textContent = '✓ Opening TravelPanel…';
    clipBtn.classList.add('success');

    await chrome.tabs.create({ url: shareUrl });
    setTimeout(() => window.close(), 400);
  });

  // ── Settings links ─────────────────────────────────────────────────────────

  document.getElementById('settings-link').addEventListener('click', openOptions);
  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    openOptions();
  });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

init().catch((err) => {
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.textContent = 'Error loading page info';
    titleEl.classList.remove('loading');
  }
  console.error('[TravelPanel Clipper]', err);
});
