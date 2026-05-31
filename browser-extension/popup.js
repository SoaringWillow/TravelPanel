'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

// ── Storage helpers ────────────────────────────────────────────────────────

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { travelPanelUrl: 'https://travelpanel.vercel.app' },
      resolve,
    );
  });
}

function markSaved(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ savedUrls: [] }, (result) => {
      const savedUrls = result.savedUrls;
      if (!savedUrls.includes(url)) {
        savedUrls.push(url);
        // Keep only the last 500 URLs to avoid unbounded storage growth
        if (savedUrls.length > 500) savedUrls.splice(0, savedUrls.length - 500);
      }
      chrome.storage.local.set({ savedUrls }, resolve);
    });
  });
}

function isAlreadySaved(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ savedUrls: [] }, (result) => {
      resolve(result.savedUrls.includes(url));
    });
  });
}

// ── Keyboard shortcut hint ─────────────────────────────────────────────────

function getShortcutHint() {
  return new Promise((resolve) => {
    if (!chrome.commands) { resolve(''); return; }
    chrome.commands.getAll((commands) => {
      const cmd = commands.find((c) => c.name === '_execute_action');
      resolve(cmd && cmd.shortcut ? cmd.shortcut : '');
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl    = document.getElementById('page-title');
  const urlEl      = document.getElementById('page-url');
  const badgeEl    = document.getElementById('platform-badge');
  const saveBtn    = document.getElementById('save-btn');
  const statusEl   = document.getElementById('status');
  const settingsBtn = document.getElementById('settings-btn');
  const shortcutEl = document.getElementById('shortcut-hint');

  // ── Get current tab ──────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl   = tab.url   || '';
  const pageTitle = tab.title || 'New inspiration';

  // Block non-http pages (chrome://, about:, etc.)
  const isClippable = pageUrl.startsWith('http://') || pageUrl.startsWith('https://');

  if (!isClippable) {
    document.getElementById('preview-card').style.display = 'none';
    document.getElementById('unsupported-notice').style.display = 'flex';
    saveBtn.disabled = true;
    return;
  }

  // ── Populate preview ─────────────────────────────────────────────────────
  const platform = detectPlatform(pageUrl);
  badgeEl.textContent = PLATFORM_LABELS[platform];
  badgeEl.style.backgroundColor = PLATFORM_COLORS[platform];
  titleEl.textContent = pageTitle;
  urlEl.textContent   = pageUrl;

  // ── Already saved indicator ──────────────────────────────────────────────
  const alreadySaved = await isAlreadySaved(pageUrl);
  if (alreadySaved) {
    saveBtn.textContent = '✓ Already saved — save again?';
    saveBtn.style.background = '#059669';
  }

  // ── Shortcut hint ────────────────────────────────────────────────────────
  const shortcut = await getShortcutHint();
  if (shortcut) {
    shortcutEl.textContent = `Shortcut: ${shortcut}`;
  }

  // ── Save handler ─────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Opening TravelPanel…';

    const settings = await getSettings();
    const base = settings.travelPanelUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    await markSaved(pageUrl);

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // ── Settings button ───────────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
