'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection from URL
const PLATFORM_PATTERNS = [
  { id: 'instagram',    label: 'Instagram',    pattern: /instagram\.com/ },
  { id: 'youtube',      label: 'YouTube',      pattern: /youtube\.com|youtu\.be/ },
  { id: 'xiaohongshu',  label: 'Xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com/ },
  { id: 'douyin',       label: 'Douyin',       pattern: /douyin\.com/ },
  { id: 'bilibili',     label: 'Bilibili',     pattern: /bilibili\.com/ },
  { id: 'twitter',      label: 'Twitter / X',  pattern: /twitter\.com|x\.com/ },
  { id: 'tiktok',       label: 'TikTok',       pattern: /tiktok\.com/ },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

function truncateUrl(url, maxLen = 52) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/$/, '');
    const display = host + path;
    return display.length > maxLen ? display.slice(0, maxLen) + '…' : display;
  } catch {
    return url.slice(0, maxLen);
  }
}

// --- DOM refs ---
const mainView      = document.getElementById('main-view');
const settingsView  = document.getElementById('settings-view');
const settingsBtn   = document.getElementById('settings-btn');
const backBtn       = document.getElementById('back-btn');
const appUrlInput   = document.getElementById('app-url-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsSavedMsg = document.getElementById('settings-saved-msg');
const clipBtn       = document.getElementById('clip-btn');
const openAppBtn    = document.getElementById('open-app-btn');
const faviconEl     = document.getElementById('favicon');
const pageTitleEl   = document.getElementById('page-title');
const pageUrlEl     = document.getElementById('page-url');
const platformBadge = document.getElementById('platform-badge');
const clipsCountEl  = document.getElementById('clips-count');
const statsRow      = document.getElementById('stats-row');

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// --- Load settings and tab info ---
async function init() {
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL, clipsCount: 0 });
  appUrl = stored.appUrl || DEFAULT_APP_URL;
  appUrlInput.value = appUrl;

  if (stored.clipsCount > 0) {
    clipsCountEl.textContent = `${stored.clipsCount} clip${stored.clipsCount === 1 ? '' : 's'} saved`;
    statsRow.classList.remove('hidden');
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    pageTitleEl.textContent = 'Open a travel page to clip';
    clipBtn.disabled = true;
    return;
  }

  // Populate page preview
  faviconEl.src = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
  faviconEl.onerror = () => { faviconEl.style.display = 'none'; };
  pageTitleEl.textContent = tab.title || 'Untitled page';
  pageUrlEl.textContent = truncateUrl(tab.url);

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform) {
    platformBadge.textContent = platform.label;
    platformBadge.setAttribute('data-platform', platform.id);
    platformBadge.classList.remove('hidden');
  } else {
    platformBadge.setAttribute('data-platform', 'other');
    platformBadge.textContent = 'Web';
    platformBadge.classList.remove('hidden');
  }
}

// --- Clip action ---
clipBtn.addEventListener('click', async () => {
  if (!currentTab?.url) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(currentTab.url)}&title=${encodeURIComponent(currentTab.title || '')}`;

  // Increment local clip count
  const stored = await chrome.storage.sync.get({ clipsCount: 0 });
  await chrome.storage.sync.set({ clipsCount: stored.clipsCount + 1 });

  // Open share page in a new tab, then show success in the popup
  chrome.tabs.create({ url: shareUrl });
  showSuccess();
});

function showSuccess() {
  mainView.innerHTML = `
    <div class="success-view">
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      </div>
      <p class="success-title">Clipped!</p>
      <p class="success-subtitle">TravelPanel is extracting locations<br>and wisdom from this page.</p>
    </div>
  `;
  // Auto-close after 1.8s
  setTimeout(() => window.close(), 1800);
}

// --- Open app ---
openAppBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl });
});

// --- Settings toggle ---
settingsBtn.addEventListener('click', () => {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  settingsSavedMsg.classList.add('hidden');
});

backBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
});

saveSettingsBtn.addEventListener('click', async () => {
  const raw = appUrlInput.value.trim().replace(/\/$/, '');
  const valid = raw.startsWith('http://') || raw.startsWith('https://');
  if (!valid) {
    appUrlInput.style.borderColor = '#ef4444';
    return;
  }
  appUrlInput.style.borderColor = '';
  appUrl = raw;
  await chrome.storage.sync.set({ appUrl: raw });
  settingsSavedMsg.classList.remove('hidden');
  setTimeout(() => settingsSavedMsg.classList.add('hidden'), 2000);
});

init();
