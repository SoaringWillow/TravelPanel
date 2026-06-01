'use strict';

// Platform detection (mirrors lib/parse-url.ts)
const PLATFORMS = [
  { key: 'instagram',    pattern: /instagram\.com/,                color: '#E1306C', label: 'Instagram'    },
  { key: 'youtube',      pattern: /youtube\.com|youtu\.be/,        color: '#FF0000', label: 'YouTube'      },
  { key: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com/, color: '#FF2442', label: 'Xiaohongshu'  },
  { key: 'douyin',       pattern: /douyin\.com|tiktok\.com/,       color: '#000000', label: 'TikTok'       },
  { key: 'twitter',      pattern: /twitter\.com|x\.com/,           color: '#1DA1F2', label: 'X / Twitter'  },
  { key: 'bilibili',     pattern: /bilibili\.com/,                 color: '#00A1D6', label: 'Bilibili'     },
  { key: 'pinterest',    pattern: /pinterest\.com/,                color: '#E60023', label: 'Pinterest'    },
  { key: 'tripadvisor',  pattern: /tripadvisor\./,                 color: '#00AF87', label: 'TripAdvisor'  },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { key: 'other', color: '#6366f1', label: 'Web' };
}

function show(id) {
  ['setup-panel', 'clip-panel', 'clipped-panel'].forEach((panelId) => {
    document.getElementById(panelId).style.display = panelId === id ? 'block' : 'none';
  });
}

function toggleSettings(visible) {
  const panel = document.getElementById('settings-panel');
  panel.style.display = visible ? 'block' : 'none';
}

let settingsOpen = false;
let currentTabUrl = '';
let currentTabTitle = '';
let appUrl = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved app URL
  const stored = await chrome.storage.sync.get('appUrl');
  appUrl = (stored.appUrl || '').replace(/\/$/, '');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl   = tab?.url   ?? '';
  currentTabTitle = tab?.title ?? '';

  // Populate settings inputs
  document.getElementById('settings-url-input').value = appUrl;
  document.getElementById('setup-url-input').value    = appUrl;

  if (!appUrl) {
    show('setup-panel');
    return;
  }

  renderClipPanel();

  // Settings toggle
  document.getElementById('btn-toggle-settings').addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    toggleSettings(settingsOpen);
  });

  // Settings save
  document.getElementById('btn-settings-save').addEventListener('click', saveSettings);
  document.getElementById('settings-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });

  // Setup save
  document.getElementById('btn-setup-save').addEventListener('click', saveSetup);
  document.getElementById('setup-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSetup();
  });
});

function renderClipPanel() {
  const platform = detectPlatform(currentTabUrl);

  const badge = document.getElementById('platform-badge');
  badge.textContent = platform.label;
  badge.style.backgroundColor = platform.color;

  document.getElementById('page-title').textContent = currentTabTitle || '(no title)';
  document.getElementById('page-url').textContent   = currentTabUrl;

  const hint = document.getElementById('hint-text');
  hint.innerHTML = `Opens <a href="${appUrl}" target="_blank">${new URL(appUrl).hostname}</a>/share`;

  document.getElementById('btn-clip').addEventListener('click', handleClip);

  show('clip-panel');
}

async function handleClip() {
  if (!appUrl) return;

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(currentTabUrl)}&title=${encodeURIComponent(currentTabTitle)}`;

  // Show confirmation briefly
  const sub = document.getElementById('clipped-sub');
  sub.textContent = currentTabTitle || currentTabUrl;
  show('clipped-panel');

  // Open share page in TravelPanel tab
  await chrome.tabs.create({ url: shareUrl });

  // Close popup after short delay
  setTimeout(() => window.close(), 400);
}

async function saveSettings() {
  const val = document.getElementById('settings-url-input').value.trim().replace(/\/$/, '');
  if (!val) return;
  await chrome.storage.sync.set({ appUrl: val });
  appUrl = val;
  toggleSettings(false);
  settingsOpen = false;
  renderClipPanel();
}

async function saveSetup() {
  const val = document.getElementById('setup-url-input').value.trim().replace(/\/$/, '');
  if (!val) return;
  try { new URL(val); } catch { return; } // basic validation
  await chrome.storage.sync.set({ appUrl: val });
  await chrome.storage.sync.remove('setupDone'); // clear badge
  chrome.action.setBadgeText({ text: '' });
  appUrl = val;
  renderClipPanel();
}
