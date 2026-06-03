'use strict';

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORM_META = {
  instagram:    { label: 'Instagram',  color: '#E1306C' },
  youtube:      { label: 'YouTube',    color: '#FF0000' },
  xiaohongshu:  { label: '小红书',     color: '#FF2442' },
  tiktok:       { label: 'TikTok',     color: '#010101' },
  twitter:      { label: 'Twitter/X',  color: '#1DA1F2' },
  pinterest:    { label: 'Pinterest',  color: '#E60023' },
  tripadvisor:  { label: 'TripAdvisor',color: '#34E0A1' },
  airbnb:       { label: 'Airbnb',     color: '#FF5A5F' },
  web:          { label: 'Web',        color: '#6366F1' },
};

function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('instagram.com'))                          return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('tiktok.com'))                            return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com'))   return 'twitter';
  if (u.includes('pinterest.com'))                         return 'pinterest';
  if (u.includes('tripadvisor.com'))                       return 'tripadvisor';
  if (u.includes('airbnb.com'))                            return 'airbnb';
  return 'web';
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const stateSetup    = document.getElementById('state-setup');
const stateReady    = document.getElementById('state-ready');
const stateSuccess  = document.getElementById('state-success');

const platformChip  = document.getElementById('platform-chip');
const pageTitleEl   = document.getElementById('page-title');
const pageUrlEl     = document.getElementById('page-url');

const btnSave       = document.getElementById('btn-save');
const btnSettings   = document.getElementById('btn-settings');
const btnSetupOpts  = document.getElementById('btn-open-options-setup');
const countdownEl   = document.getElementById('countdown');
const successDescEl = document.getElementById('success-desc');

// ── State helpers ─────────────────────────────────────────────────────────────

function showState(name) {
  stateSetup.classList.add('hidden');
  stateReady.classList.add('hidden');
  stateSuccess.classList.add('hidden');
  document.getElementById(`state-${name}`).classList.remove('hidden');
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve((result.appUrl || '').replace(/\/$/, ''));
    });
  });
}

// ── Main flow ─────────────────────────────────────────────────────────────────

let currentTab = null;

async function init() {
  const appUrl = await getAppUrl();

  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!appUrl) {
    showState('setup');
    return;
  }

  const url    = tab?.url    || '';
  const title  = tab?.title  || '';
  const plat   = detectPlatform(url);
  const meta   = PLATFORM_META[plat] || PLATFORM_META.web;

  platformChip.textContent       = meta.label;
  platformChip.style.background  = meta.color;
  pageTitleEl.textContent         = title || url;
  pageUrlEl.textContent           = url;

  showState('ready');
}

// ── Save handler ──────────────────────────────────────────────────────────────

btnSave.addEventListener('click', async () => {
  btnSave.disabled = true;
  btnSave.textContent = '⏳ Saving…';

  const appUrl = await getAppUrl();
  if (!appUrl) { showState('setup'); return; }

  const url    = currentTab?.url    || '';
  const title  = currentTab?.title  || '';

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Open TravelPanel share page in a new tab
  await chrome.tabs.create({ url: shareUrl, active: true });

  // Show success in popup
  successDescEl.textContent = title
    ? `"${title.slice(0, 60)}${title.length > 60 ? '…' : ''}" is being processed.`
    : `The URL is being processed.`;

  showState('success');

  // Countdown and auto-close
  let secs = 3;
  countdownEl.textContent = `Closing in ${secs}s…`;
  const interval = setInterval(() => {
    secs--;
    if (secs <= 0) {
      clearInterval(interval);
      window.close();
    } else {
      countdownEl.textContent = `Closing in ${secs}s…`;
    }
  }, 1000);
});

// ── Settings button ───────────────────────────────────────────────────────────

function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

btnSettings.addEventListener('click', openOptions);
btnSetupOpts.addEventListener('click', openOptions);

// ── Boot ──────────────────────────────────────────────────────────────────────

init().catch((err) => {
  console.error('[TravelPanel Clipper]', err);
  showState('setup');
});
