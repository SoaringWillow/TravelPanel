'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getAppUrl() {
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  return (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
}

async function getDailyCount() {
  const today = new Date().toDateString();
  const { clipData } = await chrome.storage.local.get(['clipData']);
  if (!clipData || clipData.date !== today) return 0;
  return clipData.count || 0;
}

async function incrementDailyCount() {
  const today = new Date().toDateString();
  const { clipData } = await chrome.storage.local.get(['clipData']);
  const count = clipData?.date === today ? (clipData.count || 0) + 1 : 1;
  await chrome.storage.local.set({ clipData: { date: today, count } });
  return count;
}

// ── Platform detection ───────────────────────────────────────────────────────

const PLATFORMS = [
  [/xiaohongshu\.com|xhslink\.com/i, '小红书'],
  [/tiktok\.com/i, 'TikTok'],
  [/douyin\.com/i, '抖音'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/instagram\.com/i, 'Instagram'],
  [/mp\.weixin\.qq\.com|weixin\.qq\.com/i, 'WeChat'],
  [/bilibili\.com/i, 'Bilibili'],
  [/twitter\.com|x\.com/i, 'X (Twitter)'],
  [/pinterest\.com/i, 'Pinterest'],
  [/tripadvisor\.com/i, 'TripAdvisor'],
  [/booking\.com/i, 'Booking.com'],
  [/airbnb\.com/i, 'Airbnb'],
];

function detectPlatform(url) {
  if (!url) return null;
  for (const [pattern, name] of PLATFORMS) {
    if (pattern.test(url)) return name;
  }
  return null;
}

// ── Clip action ──────────────────────────────────────────────────────────────

async function clipPage(tab, { clipBtn, statusEl, clipCountEl }) {
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    statusEl.textContent = 'Cannot clip browser or extension pages.';
    statusEl.className = 'status error';
    return;
  }

  clipBtn.disabled = true;
  statusEl.textContent = 'Opening TravelPanel…';
  statusEl.className = 'status';

  const appUrl = await getAppUrl();
  const importUrl = `${appUrl}?import=${encodeURIComponent(tab.url)}`;

  try {
    const allTabs = await chrome.tabs.query({});
    const existing = allTabs.find(t => t.url?.startsWith(appUrl) || t.pendingUrl?.startsWith(appUrl));

    if (existing) {
      await chrome.tabs.update(existing.id, { url: importUrl, active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: importUrl });
    }

    const newCount = await incrementDailyCount();
    clipCountEl.textContent = `${newCount} clip${newCount === 1 ? '' : 's'} saved today`;

    clipBtn.classList.add('success');
    document.getElementById('clipIcon').innerHTML = `<polyline points="20 6 9 17 4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    document.getElementById('clipBtnLabel').textContent = 'Clipped!';
    statusEl.textContent = 'Sent to TravelPanel';
    statusEl.className = 'status success';

    setTimeout(() => window.close(), 1200);
  } catch (err) {
    clipBtn.disabled = false;
    statusEl.textContent = 'Something went wrong. Try again.';
    statusEl.className = 'status error';
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const titleEl = document.getElementById('pageTitle');
  const urlEl = document.getElementById('pageUrl');
  const badgeEl = document.getElementById('platformBadge');
  const clipBtn = document.getElementById('clipBtn');
  const statusEl = document.getElementById('status');
  const clipCountEl = document.getElementById('clipCount');

  // Populate page info
  if (tab) {
    titleEl.textContent = tab.title || 'Untitled Page';
    urlEl.textContent = tab.url || '';

    const platform = detectPlatform(tab.url);
    if (platform) {
      badgeEl.textContent = platform;
      badgeEl.style.display = 'block';
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('about:')) {
      clipBtn.disabled = true;
      statusEl.textContent = 'Nothing to clip on this page.';
    }
  }

  // Daily count
  const count = await getDailyCount();
  if (count > 0) {
    clipCountEl.textContent = `${count} clip${count === 1 ? '' : 's'} saved today`;
  }

  // Settings
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open app
  document.getElementById('openAppBtn').addEventListener('click', async () => {
    const appUrl = await getAppUrl();
    chrome.tabs.create({ url: appUrl });
  });

  // Clip
  clipBtn.addEventListener('click', () => clipPage(tab, { clipBtn, statusEl, clipCountEl }));
}

init();
