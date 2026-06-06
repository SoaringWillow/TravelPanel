'use strict';

const STORAGE_KEY = 'travelPanelUrl';

// Platform detection mirrors the app's lib/parse-url.ts
const PLATFORM_PATTERNS = [
  { pattern: /xiaohongshu|xhslink|x\.com\/i\/web\/show\/type=note/, label: '小红书', color: '#ff2442' },
  { pattern: /douyin|tiktok/, label: 'Douyin', color: '#010101' },
  { pattern: /bilibili/, label: 'Bilibili', color: '#fb7299' },
  { pattern: /youtube/, label: 'YouTube', color: '#ff0000' },
  { pattern: /instagram/, label: 'Instagram', color: '#e1306c' },
  { pattern: /weixin|wechat|mp\.weixin/, label: 'WeChat', color: '#07c160' },
];

function detectPlatform(url) {
  for (const { pattern, label, color } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { label, color };
  }
  return null;
}

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function buildShareUrl(base, url, title) {
  return `${base.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ── Setup view ────────────────────────────────────────────────────────────────

function initSetupView() {
  const input = document.getElementById('setup-url');
  const btn = document.getElementById('setup-connect-btn');

  btn.addEventListener('click', async () => {
    let url = input.value.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    url = url.replace(/\/$/, '');

    btn.disabled = true;
    btn.textContent = 'Saving…';

    await chrome.storage.local.set({ [STORAGE_KEY]: url });
    await initMainView(url);
    showView('main-view');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });

  input.focus();
}

// ── Main view ─────────────────────────────────────────────────────────────────

async function initMainView(baseUrl) {
  const tab = await getActiveTab();
  const url = tab?.url || '';
  const title = tab?.title || url;

  // Title + URL
  document.getElementById('page-title').textContent = title || 'Untitled page';
  document.getElementById('page-url').textContent = url;

  // Platform chip
  const platform = detectPlatform(url);
  if (platform) {
    const chip = document.getElementById('platform-chip');
    chip.textContent = platform.label;
    chip.style.background = platform.color;
    chip.style.display = 'inline-block';
  }

  // Favicon
  if (url) {
    try {
      const origin = new URL(url).origin;
      const favicon = document.getElementById('favicon');
      favicon.src = `${origin}/favicon.ico`;
      favicon.style.display = 'block';
      favicon.onerror = () => { favicon.style.display = 'none'; };
    } catch { /* ignore */ }
  }

  // Save button
  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', () => {
    const shareUrl = buildShareUrl(baseUrl, url, title);
    chrome.windows.create({ url: shareUrl, type: 'popup', width: 420, height: 640 });
    showView('success-view');
    setTimeout(() => window.close(), 2000);
  });

  // Settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Open app
  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: baseUrl });
    window.close();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const { travelPanelUrl } = await chrome.storage.local.get(STORAGE_KEY);

  if (!travelPanelUrl) {
    showView('setup-view');
    initSetupView();
  } else {
    await initMainView(travelPanelUrl);
    showView('main-view');
  }
}

init();
