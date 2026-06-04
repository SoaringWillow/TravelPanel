'use strict';

// ─── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', color: '#e1306c', pattern: /instagram\.com/ },
  youtube:   { label: 'YouTube',   color: '#ff0000', pattern: /youtube\.com|youtu\.be/ },
  xiaohongshu: { label: '小红书',  color: '#ff2442', pattern: /xiaohongshu\.com|xhslink\.com/ },
  tiktok:    { label: 'TikTok',    color: '#000000', pattern: /tiktok\.com/ },
  twitter:   { label: 'X / Twitter', color: '#1da1f2', pattern: /twitter\.com|x\.com/ },
  pinterest: { label: 'Pinterest', color: '#e60023', pattern: /pinterest\.com/ },
};

function detectPlatform(url) {
  for (const [key, cfg] of Object.entries(PLATFORM_CONFIG)) {
    if (cfg.pattern.test(url)) return { key, ...cfg };
  }
  return { key: 'web', label: 'Web', color: '#4f46e5' };
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const notConfigured  = document.getElementById('notConfigured');
const mainContent    = document.getElementById('mainContent');
const successState   = document.getElementById('successState');
const platformChip   = document.getElementById('platformChip');
const pageTitle      = document.getElementById('pageTitle');
const pageUrlEl      = document.getElementById('pageUrl');
const saveBtn        = document.getElementById('saveBtn');
const settingsBtn    = document.getElementById('settingsBtn');
const openOptionsBtn = document.getElementById('openOptionsBtn');

// ─── State ───────────────────────────────────────────────────────────────────

let currentTab = null;

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Load configured TravelPanel URL
  const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');

  if (!travelPanelUrl) {
    notConfigured.style.display = 'block';
    mainContent.style.display = 'none';
    return;
  }

  // Populate UI
  const url = tab.url || '';
  const title = tab.title || 'Untitled page';
  const platform = detectPlatform(url);

  platformChip.textContent = platform.label;
  platformChip.style.background = platform.color + '22';
  platformChip.style.color = platform.color;

  pageTitle.textContent = title;
  pageUrlEl.textContent = url;

  // Disable save for chrome:// and extension pages
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    saveBtn.disabled = true;
    saveBtn.querySelector('span:last-child').textContent = 'Cannot clip this page';
  }
}

// ─── Save handler ─────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');
  if (!travelPanelUrl || !currentTab) return;

  const url = currentTab.url || '';
  const title = currentTab.title || '';

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', url);
  if (title) shareUrl.searchParams.set('title', title);

  await chrome.tabs.create({ url: shareUrl.toString() });

  // Show success state
  mainContent.style.display = 'none';
  successState.classList.add('visible');

  // Close popup after a moment
  setTimeout(() => window.close(), 1200);
});

// ─── Settings ────────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

openOptionsBtn?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

init();
