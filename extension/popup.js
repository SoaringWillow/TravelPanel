'use strict';

const PLATFORMS = [
  { patterns: ['weixin.qq.com', 'mp.weixin.qq.com'], name: 'WeChat', emoji: '💬' },
  { patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'], name: 'Xiaohongshu', emoji: '📕' },
  { patterns: ['douyin.com', 'iesdouyin.com'], name: 'Douyin', emoji: '🎵' },
  { patterns: ['tiktok.com'], name: 'TikTok', emoji: '🎵' },
  { patterns: ['bilibili.com', 'b23.tv'], name: 'Bilibili', emoji: '📺' },
  { patterns: ['instagram.com'], name: 'Instagram', emoji: '📸' },
  { patterns: ['youtube.com', 'youtu.be'], name: 'YouTube', emoji: '▶️' },
  { patterns: ['twitter.com', 'x.com'], name: 'X / Twitter', emoji: '𝕏' },
  { patterns: ['maps.google.com', 'google.com/maps'], name: 'Google Maps', emoji: '📍' },
  { patterns: ['tripadvisor.com'], name: 'TripAdvisor', emoji: '✈️' },
  { patterns: ['airbnb.com'], name: 'Airbnb', emoji: '🏠' },
  { patterns: ['booking.com'], name: 'Booking.com', emoji: '🏨' },
];

function detectPlatform(url) {
  const lower = url.toLowerCase();
  for (const p of PLATFORMS) {
    if (p.patterns.some(pat => lower.includes(pat))) {
      return { name: p.name, emoji: p.emoji };
    }
  }
  return { name: 'Web', emoji: '🌐' };
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    const display = u.hostname.replace(/^www\./, '') + u.pathname;
    return display.length > 46 ? display.slice(0, 44) + '…' : display;
  } catch {
    return url.slice(0, 46);
  }
}

function isRestrictedUrl(url) {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('moz-extension://')
  );
}

async function getTravelPanelUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' }, data => {
      resolve((data.travelPanelUrl || 'http://localhost:3000').replace(/\/$/, ''));
    });
  });
}

function show(id) {
  ['loadingState', 'mainState', 'successState', 'restrictedState'].forEach(stateId => {
    document.getElementById(stateId).style.display = stateId === id ? 'block' : 'none';
  });
}

async function init() {
  show('loadingState');

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    show('mainState');
    showError('Could not access the current tab.');
    return;
  }

  if (!tab || isRestrictedUrl(tab.url || '')) {
    show('restrictedState');
    return;
  }

  const url = tab.url;
  const title = tab.title || '';
  const platform = detectPlatform(url);

  document.getElementById('platformEmoji').textContent = platform.emoji;
  document.getElementById('platformName').textContent = platform.name;
  document.getElementById('pageTitle').textContent = title || 'Untitled';
  document.getElementById('pageUrl').textContent = shortenUrl(url);

  show('mainState');

  document.getElementById('saveBtn').addEventListener('click', () => save(url, title));
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

async function save(url, title) {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="btn-spinner"></div><span>Opening…</span>';

  const baseUrl = await getTravelPanelUrl();
  const shareUrl =
    baseUrl +
    '/share?url=' +
    encodeURIComponent(url) +
    '&title=' +
    encodeURIComponent(title);

  try {
    await chrome.tabs.create({ url: shareUrl });
    show('successState');
    setTimeout(() => window.close(), 1000);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>📌</span><span>Save to TravelPanel</span>';
    showError('Could not open TravelPanel. Check Settings to verify your URL.');
  }
}

init();
