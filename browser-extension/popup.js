'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

// Platform detection — mirrors lib/parse-url.ts logic
const PLATFORMS = [
  { test: (u) => /weixin\.qq\.com|mp\.weixin/i.test(u),          name: 'WeChat',        color: '#07C160' },
  { test: (u) => /xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(u), name: '小红书',    color: '#FF2442' },
  { test: (u) => /douyin\.com|iesdouyin\.com|tiktok\.com/i.test(u),  name: 'Douyin / TikTok', color: '#161823' },
  { test: (u) => /bilibili\.com|b23\.tv/i.test(u),               name: 'Bilibili',      color: '#00AEEC' },
  { test: (u) => /youtube\.com|youtu\.be/i.test(u),              name: 'YouTube',       color: '#FF0000' },
  { test: (u) => /instagram\.com/i.test(u),                      name: 'Instagram',     color: '#E1306C' },
  { test: (u) => /maps\.google\./i.test(u),                      name: 'Google Maps',   color: '#4285F4' },
  { test: (u) => /tripadvisor\./i.test(u),                       name: 'TripAdvisor',   color: '#00AF87' },
  { test: (u) => /airbnb\./i.test(u),                            name: 'Airbnb',        color: '#FF5A5F' },
  { test: (u) => /booking\.com/i.test(u),                        name: 'Booking.com',   color: '#003580' },
];

const TRAVEL_KEYWORDS = [
  'travel', 'trip', 'vacation', 'holiday', 'tour', 'explore', 'adventure',
  'itinerary', 'destination', 'hotel', 'resort', 'hostel', 'restaurant',
  'cafe', 'beach', 'mountain', 'hiking', 'sightseeing', 'museum', 'temple',
  'tourist', 'tourism', 'scenic', 'landscape', 'culture', '旅行', '旅游',
  '攻略', '打卡', '美食', '景点',
];

function detectPlatform(url) {
  return PLATFORMS.find((p) => p.test(url)) ?? null;
}

function isTravelContent(title, url) {
  if (detectPlatform(url)) return true;
  const text = (title + ' ' + url).toLowerCase();
  return TRAVEL_KEYWORDS.some((kw) => text.includes(kw));
}

function truncate(str, max) {
  const s = String(str || '').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function showState(name) {
  for (const id of ['state-loading', 'state-main', 'state-error']) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !id.endsWith(name));
  }
}

async function init() {
  // state-loading is visible by default; others are hidden via CSS class

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showState('error');
    document.getElementById('error-msg').textContent = 'Could not access the current tab.';
    return;
  }

  const url   = tab?.url   ?? '';
  const title = tab?.title ?? '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showState('error');
    document.getElementById('error-msg').textContent =
      'This page type can\'t be saved to TravelPanel.';
    return;
  }

  // ── Populate UI ──
  const platform = detectPlatform(url);
  document.getElementById('page-title').textContent = truncate(title, 72) || 'Untitled page';
  document.getElementById('page-url').textContent   = truncate(
    url.replace(/^https?:\/\/(www\.)?/, ''), 58
  );

  if (platform) {
    const chip = document.getElementById('platform-chip');
    chip.textContent = platform.name;
    chip.style.backgroundColor = platform.color;
    document.getElementById('platform-row').classList.remove('hidden');
  }

  if (isTravelContent(title, url)) {
    document.getElementById('travel-hint').classList.remove('hidden');
  }

  showState('main');

  // ── Save handler ──
  document.getElementById('save-btn').addEventListener('click', async () => {
    const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
    const base     = travelpanelUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl, active: true });
    window.close();
  });

  // ── Settings ──
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

init();
