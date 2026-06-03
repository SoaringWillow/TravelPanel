'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORMS = {
  'xiaohongshu.com': { name: 'Xiaohongshu', emoji: '📕' },
  'xhslink.com':     { name: 'Xiaohongshu', emoji: '📕' },
  'instagram.com':   { name: 'Instagram',   emoji: '📷' },
  'youtube.com':     { name: 'YouTube',     emoji: '▶️' },
  'youtu.be':        { name: 'YouTube',     emoji: '▶️' },
  'tiktok.com':      { name: 'TikTok',      emoji: '🎵' },
  'douyin.com':      { name: 'Douyin',      emoji: '🎵' },
  'bilibili.com':    { name: 'Bilibili',    emoji: '📺' },
  'weibo.com':       { name: 'Weibo',       emoji: '🌐' },
  'pinterest.com':   { name: 'Pinterest',   emoji: '📌' },
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (hostname.endsWith(domain)) return info;
    }
  } catch {}
  return null;
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    const display = u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
    return display.length > 48 ? display.slice(0, 45) + '…' : display;
  } catch {
    return url.length > 48 ? url.slice(0, 45) + '…' : url;
  }
}

const el = id => document.getElementById(id);

let currentTab = null;

// ── Init ──────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTab = tab;
  if (!tab) return;

  el('pageTitle').textContent = tab.title || 'Untitled page';
  el('pageTitle').title = tab.title || '';
  el('pageUrlText').textContent = shortenUrl(tab.url || '');

  if (tab.favIconUrl) {
    const img = el('favicon');
    img.src = tab.favIconUrl;
    img.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; };
  }

  const platform = detectPlatform(tab.url || '');
  if (platform) {
    const badge = el('platformBadge');
    badge.textContent = `${platform.emoji} ${platform.name}`;
    badge.style.display = 'inline-flex';
  }

  // Disable if already on the TravelPanel app itself
  chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
    const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
    if ((tab.url || '').startsWith(base)) {
      el('saveBtn').disabled = true;
      showStatus('error', 'Navigate to a page you want to clip first.');
    }
  });
});

// ── Save ──────────────────────────────────────────────────────
el('saveBtn').addEventListener('click', () => {
  if (!currentTab?.url) return;

  chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
    const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
    const params = new URLSearchParams({
      url: currentTab.url,
      title: currentTab.title || '',
    });
    const note = el('noteInput').value.trim();
    if (note) params.set('note', note);

    const shareUrl = `${base}/share?${params.toString()}`;

    setLoading(true);

    chrome.tabs.create({ url: shareUrl }, () => {
      if (chrome.runtime.lastError) {
        setLoading(false);
        showStatus('error', 'Could not open TravelPanel. Check settings.');
        return;
      }
      setSuccess();
      setTimeout(() => window.close(), 1000);
    });
  });
});

// ── Settings ─────────────────────────────────────────────────
el('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── UI helpers ────────────────────────────────────────────────
function setLoading(on) {
  const btn = el('saveBtn');
  btn.disabled = on;
  btn.innerHTML = on
    ? '<div class="spinner"></div><span>Opening TravelPanel…</span>'
    : '<span class="btn-icon">📍</span><span id="saveBtnLabel">Save to TravelPanel</span>';
}

function setSuccess() {
  const btn = el('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>✓</span><span>Opened in TravelPanel!</span>';
  btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  btn.style.boxShadow  = '0 2px 12px rgba(16, 185, 129, 0.35)';
}

function showStatus(type, msg) {
  const s = el('statusMsg');
  s.className = `status ${type}`;
  s.textContent = msg;
}
