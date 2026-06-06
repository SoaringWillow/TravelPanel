'use strict';

const DEFAULT_TP_URL = 'http://localhost:3000';

// Platform detection — mirrors lib/parse-url.ts in the main app
const PLATFORMS = [
  { match: ['weixin.qq.com', 'wx.qq.com'],           label: '微信 WeChat',      color: '#07C160' },
  { match: ['xiaohongshu.com', 'xhslink.com'],        label: '小红书',           color: '#FF2442' },
  { match: ['douyin.com', 'tiktok.com'],              label: 'Douyin / TikTok', color: '#010101' },
  { match: ['bilibili.com'],                          label: 'Bilibili',        color: '#00A1D6' },
  { match: ['youtube.com', 'youtu.be'],               label: 'YouTube',         color: '#FF0000' },
  { match: ['instagram.com'],                         label: 'Instagram',       color: '#C13584' },
  { match: ['twitter.com', 'x.com'],                  label: 'X / Twitter',     color: '#1DA1F2' },
];

let currentTab = null;
let tpUrl = DEFAULT_TP_URL;
let isSettingsOpen = false;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const { tpUrl: saved } = await chrome.storage.sync.get(['tpUrl']);
  tpUrl = saved || DEFAULT_TP_URL;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab?.url) {
    renderPageCard(tab);
  }

  if (!saved) {
    document.getElementById('setupNotice').style.display = 'block';
  }

  // Enable clip button after tab info loaded
  document.getElementById('clipBtn').disabled = false;

  bindEvents();
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url);
    for (const p of PLATFORMS) {
      if (p.match.some((m) => hostname.includes(m))) return p;
    }
  } catch { /* non-URL (chrome://, etc.) */ }
  return { label: 'Web', color: '#6366F1' };
}

// ── Render page card ──────────────────────────────────────────────────────────

function renderPageCard(tab) {
  // Favicon
  const favicon = document.getElementById('favicon');
  try {
    const { hostname } = new URL(tab.url);
    favicon.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    favicon.onerror = () => favicon.classList.add('hidden');
  } catch {
    favicon.classList.add('hidden');
  }

  // Title (replace skeleton)
  const titleEl = document.getElementById('pageTitle');
  titleEl.textContent = tab.title || 'Untitled page';

  // URL (replace skeleton)
  const urlEl = document.getElementById('pageUrl');
  try {
    const { hostname, pathname } = new URL(tab.url);
    const path = pathname.length > 1
      ? (pathname.length > 32 ? pathname.slice(0, 32) + '…' : pathname)
      : '';
    urlEl.textContent = hostname + path;
  } catch {
    urlEl.textContent = (tab.url || '').slice(0, 55);
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  const badge = document.getElementById('platformBadge');
  badge.textContent = platform.label;
  badge.style.backgroundColor = platform.color;
  badge.style.display = 'inline-flex';
}

// ── Clip action ───────────────────────────────────────────────────────────────

function handleClip() {
  if (!currentTab?.url) return;

  const shareUrl =
    `${tpUrl}/share` +
    `?url=${encodeURIComponent(currentTab.url)}` +
    `&title=${encodeURIComponent(currentTab.title || '')}`;

  chrome.tabs.create({ url: shareUrl });

  const btn = document.getElementById('clipBtn');
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Opening TravelPanel…
  `;
  btn.classList.add('success');
  btn.disabled = true;

  setTimeout(() => window.close(), 1300);
}

// ── Settings toggle ───────────────────────────────────────────────────────────

function toggleSettings() {
  isSettingsOpen = !isSettingsOpen;
  document.getElementById('mainView').style.display = isSettingsOpen ? 'none' : 'block';
  document.getElementById('settingsView').style.display = isSettingsOpen ? 'block' : 'none';

  if (isSettingsOpen) {
    const input = document.getElementById('tpUrlInput');
    input.value = tpUrl === DEFAULT_TP_URL ? '' : tpUrl;
    input.placeholder = tpUrl;
    input.focus();
  }
}

// ── Save settings ─────────────────────────────────────────────────────────────

async function saveSettings() {
  const input = document.getElementById('tpUrlInput');
  const raw = input.value.trim().replace(/\/+$/, '');

  if (!raw) {
    // Keep existing if empty
    toggleSettings();
    return;
  }

  try {
    new URL(raw); // validate
  } catch {
    input.classList.add('error');
    input.focus();
    setTimeout(() => input.classList.remove('error'), 1500);
    return;
  }

  tpUrl = raw;
  await chrome.storage.sync.set({ tpUrl: raw });

  const btn = document.getElementById('saveBtn');
  btn.textContent = '✓ Saved!';
  document.getElementById('setupNotice').style.display = 'none';

  setTimeout(() => {
    btn.textContent = 'Save Settings';
    toggleSettings();
  }, 900);
}

// ── Events ────────────────────────────────────────────────────────────────────

function bindEvents() {
  document.getElementById('clipBtn').addEventListener('click', handleClip);
  document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('setupLink')?.addEventListener('click', toggleSettings);

  document.getElementById('tpUrlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
    if (e.key === 'Escape') toggleSettings();
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init().catch(console.error);
