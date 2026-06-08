const DEFAULT_APP_URL = 'http://localhost:3000';

// Platform detection matching the TravelPanel app
const PLATFORM_MAP = [
  { pattern: /instagram\.com/i,       id: 'instagram',    label: 'Instagram' },
  { pattern: /youtube\.com|youtu\.be/i, id: 'youtube',    label: 'YouTube' },
  { pattern: /xiaohongshu\.com|xhslink\.com/i, id: 'xiaohongshu', label: '小红书' },
  { pattern: /douyin\.com/i,           id: 'douyin',      label: 'Douyin' },
  { pattern: /tiktok\.com/i,           id: 'tiktok',      label: 'TikTok' },
  { pattern: /bilibili\.com/i,         id: 'bilibili',    label: 'Bilibili' },
  { pattern: /weixin\.qq\.com|mp\.weixin/i, id: 'wechat', label: 'WeChat' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_MAP) {
    if (p.pattern.test(url)) return { id: p.id, label: p.label };
  }
  return null;
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const mainPanel     = document.getElementById('mainPanel');
const successPanel  = document.getElementById('successPanel');
const errorPanel    = document.getElementById('errorPanel');
const settingsPanel = document.getElementById('settingsPanel');

const pageTitleEl   = document.getElementById('pageTitle');
const pageUrlEl     = document.getElementById('pageUrl');
const platformBadge = document.getElementById('platformBadge');

const saveBtn       = document.getElementById('saveBtn');
const openAppBtn    = document.getElementById('openAppBtn');
const retryBtn      = document.getElementById('retryBtn');
const viewBtn       = document.getElementById('viewBtn');
const settingsToggle = document.getElementById('settingsToggle');

const appUrlInput   = document.getElementById('appUrlInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsSaved = document.getElementById('settingsSaved');

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load settings
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  appUrl = stored.appUrl.replace(/\/$/, '');
  appUrlInput.value = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url) {
    showError('No active tab found.');
    return;
  }

  // Fill preview
  const title = tab.title || 'Untitled page';
  pageTitleEl.textContent = title;

  try {
    const u = new URL(tab.url);
    pageUrlEl.textContent = u.hostname + u.pathname.slice(0, 40) + (u.pathname.length > 40 ? '…' : '');
  } catch {
    pageUrlEl.textContent = tab.url.slice(0, 50);
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform) {
    platformBadge.textContent = platform.label;
    platformBadge.setAttribute('data-platform', platform.id);
  } else {
    platformBadge.textContent = 'Web';
  }
}

// ─── Save action ──────────────────────────────────────────────────────────────

function showPanel(panel) {
  [mainPanel, successPanel, errorPanel].forEach(p => p.classList.add('hidden'));
  panel.classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showPanel(errorPanel);
}

async function doSave() {
  if (!currentTab || !currentTab.url) {
    showError('No active tab URL to save.');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Opening…';

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(currentTab.url)}&title=${encodeURIComponent(currentTab.title || '')}`;

  try {
    await chrome.tabs.create({ url: shareUrl });
    showPanel(successPanel);
  } catch (err) {
    showError(`Could not open TravelPanel: ${err.message}`);
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

saveBtn.addEventListener('click', doSave);

retryBtn.addEventListener('click', () => {
  showPanel(mainPanel);
  doSave();
});

openAppBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl });
});

viewBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appUrl });
  window.close();
});

settingsToggle.addEventListener('click', () => {
  const isHidden = settingsPanel.classList.contains('hidden');
  settingsPanel.classList.toggle('hidden', !isHidden);
  settingsToggle.classList.toggle('active', isHidden);
});

saveSettingsBtn.addEventListener('click', async () => {
  const newUrl = appUrlInput.value.trim().replace(/\/$/, '') || DEFAULT_APP_URL;
  appUrl = newUrl;
  await chrome.storage.sync.set({ appUrl: newUrl });
  settingsSaved.classList.remove('hidden');
  setTimeout(() => settingsSaved.classList.add('hidden'), 2000);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
