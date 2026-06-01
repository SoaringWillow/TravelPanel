'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

const PLATFORMS = [
  { match: ['instagram.com'],                    label: 'Instagram',    color: '#e1306c' },
  { match: ['youtube.com', 'youtu.be'],          label: 'YouTube',      color: '#ff0000' },
  { match: ['xiaohongshu.com', 'xhslink.com'],   label: 'Xiaohongshu',  color: '#ff2442' },
  { match: ['tiktok.com'],                       label: 'TikTok',       color: '#010101' },
  { match: ['twitter.com', 'x.com'],             label: 'X / Twitter',  color: '#1da1f2' },
  { match: ['maps.google.com', 'goo.gl/maps'],   label: 'Google Maps',  color: '#4285f4' },
  { match: ['tripadvisor.com'],                  label: 'TripAdvisor',  color: '#34e0a1' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.match.some((s) => url.includes(s))) return p;
  }
  return null;
}

async function init() {
  const titleEl      = document.getElementById('page-title');
  const urlEl        = document.getElementById('page-url');
  const chipContainer = document.getElementById('platform-chip-container');
  const clipBtn      = document.getElementById('clip-btn');
  const successEl    = document.getElementById('success');
  const optionsBtn   = document.getElementById('options-btn');
  const openAppLink  = document.getElementById('open-app-link');

  // Load app URL from sync storage
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  openAppLink.href = appUrl;

  // Get active tab info
  let pageUrl = '';
  let pageTitle = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageUrl   = tab.url   || '';
    pageTitle = tab.title || '';
  } catch {
    titleEl.textContent = 'Cannot access this page';
    titleEl.classList.add('placeholder');
    clipBtn.disabled = true;
    return;
  }

  // Render page preview
  titleEl.textContent = pageTitle || 'Untitled page';
  if (!pageTitle) titleEl.classList.add('placeholder');
  urlEl.textContent = pageUrl;

  // Platform chip
  const platform = detectPlatform(pageUrl);
  if (platform) {
    const chip = document.createElement('span');
    chip.className = 'platform-chip';
    chip.style.backgroundColor = platform.color;
    chip.textContent = platform.label;
    chipContainer.appendChild(chip);
  }

  // Disable clip on non-http pages (new tab, chrome://, etc.)
  if (!pageUrl.startsWith('http')) {
    clipBtn.disabled = true;
    titleEl.textContent = 'Navigate to a web page to clip it';
    titleEl.classList.add('placeholder');
    urlEl.textContent = '';
    return;
  }

  // Clip button
  clipBtn.addEventListener('click', () => {
    const shareUrl =
      `${appUrl}/share` +
      `?url=${encodeURIComponent(pageUrl)}` +
      `&title=${encodeURIComponent(pageTitle)}`;

    chrome.tabs.create({ url: shareUrl });

    document.getElementById('actions').style.display = 'none';
    successEl.classList.remove('hidden');

    setTimeout(() => window.close(), 1400);
  });

  // Options button
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
