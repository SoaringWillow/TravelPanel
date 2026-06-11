'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = [
  { pattern: /instagram\.com/i,      emoji: '📸', label: 'Instagram' },
  { pattern: /youtube\.com|youtu\.be/i, emoji: '▶️', label: 'YouTube' },
  { pattern: /xiaohongshu\.com|xhslink\.com|xhs\.cn/i, emoji: '📕', label: '小红书' },
  { pattern: /tiktok\.com/i,         emoji: '🎵', label: 'TikTok' },
  { pattern: /douyin\.com/i,         emoji: '🎵', label: '抖音' },
  { pattern: /bilibili\.com/i,       emoji: '📺', label: 'Bilibili' },
  { pattern: /twitter\.com|x\.com/i, emoji: '🐦', label: 'Twitter / X' },
  { pattern: /maps\.google\./i,      emoji: '🗺', label: 'Google Maps' },
  { pattern: /tripadvisor\./i,       emoji: '🦉', label: 'Tripadvisor' },
  { pattern: /airbnb\./i,            emoji: '🏡', label: 'Airbnb' },
  { pattern: /booking\.com/i,        emoji: '🏨', label: 'Booking.com' },
  { pattern: /pinterest\./i,         emoji: '📌', label: 'Pinterest' },
  { pattern: /lonelyplanet\./i,      emoji: '📖', label: 'Lonely Planet' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { emoji: '🌐', label: 'Web' };
}

function truncateUrl(url, maxLen = 48) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + '…' : display;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
      resolve(data.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const loadingEl   = document.getElementById('loadingState');
  const contentEl   = document.getElementById('contentState');
  const errorEl     = document.getElementById('errorState');
  const errorMsgEl  = document.getElementById('errorMessage');
  const titleEl     = document.getElementById('pageTitle');
  const urlEl       = document.getElementById('pageUrl');
  const badgeEl     = document.getElementById('platformBadge');
  const labelEl     = document.getElementById('platformLabel');
  const clipBtn     = document.getElementById('clipBtn');
  const successEl   = document.getElementById('successState');
  const optionsLink = document.getElementById('optionsLink');

  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  let currentTab;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
  } catch (err) {
    showError('Could not access the current tab.');
    return;
  }

  const url = currentTab?.url || '';
  const title = currentTab?.title || '';

  // Block non-clippable pages
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:') || url.startsWith('moz-extension://')) {
    showError('This page can\'t be clipped. Navigate to a travel page first.');
    return;
  }

  // Show page info
  const platform = detectPlatform(url);
  badgeEl.textContent  = platform.emoji;
  labelEl.textContent  = platform.label;
  titleEl.textContent  = title || 'Untitled page';
  urlEl.textContent    = truncateUrl(url);

  loadingEl.hidden  = true;
  contentEl.hidden  = false;
  clipBtn.disabled  = false;

  // Clip action
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;

    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    chrome.tabs.create({ url: shareUrl });

    // Show success briefly then close
    clipBtn.hidden      = true;
    successEl.hidden    = false;

    setTimeout(() => window.close(), 1400);
  });

  function showError(msg) {
    loadingEl.hidden = true;
    contentEl.hidden = true;
    errorEl.hidden   = false;
    errorMsgEl.textContent = msg;
  }
}

document.addEventListener('DOMContentLoaded', init);
