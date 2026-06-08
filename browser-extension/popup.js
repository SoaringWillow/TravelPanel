'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ─────────────────────────

const PLATFORMS = [
  { id: 'instagram',    pattern: /instagram\.com/,                       label: 'Instagram',    color: '#E1306C' },
  { id: 'youtube',      pattern: /youtube\.com|youtu\.be/,               label: 'YouTube',      color: '#FF0000' },
  { id: 'tiktok',       pattern: /tiktok\.com/,                          label: 'TikTok',       color: '#010101' },
  { id: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com/,        label: '小红书',        color: '#FF2442' },
  { id: 'pinterest',    pattern: /pinterest\.com/,                        label: 'Pinterest',    color: '#E60023' },
  { id: 'twitter',      pattern: /twitter\.com|x\.com/,                  label: 'Twitter / X',  color: '#1DA1F2' },
  { id: 'tripadvisor',  pattern: /tripadvisor\.com/,                     label: 'TripAdvisor',  color: '#34E0A1' },
  { id: 'google-maps',  pattern: /maps\.google\.com|google\.com\/maps/,  label: 'Google Maps',  color: '#4285F4' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6366f1' };
}

// ── Views ──────────────────────────────────────────────────────────────────

function show(id) {
  ['setup-view', 'main-view', 'success-view'].forEach((v) => {
    document.getElementById(v).classList.toggle('hidden', v !== id);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function init() {
  const { travelpanelUrl } = await chrome.storage.sync.get('travelpanelUrl');

  if (!travelpanelUrl) {
    show('setup-view');
    document.getElementById('open-settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   ?? '';
  const title = tab?.title ?? 'Untitled page';

  // Platform badge
  const platform = detectPlatform(url);
  const badge     = document.getElementById('platform-badge');
  badge.textContent              = platform.label;
  badge.style.backgroundColor    = platform.color;

  // Page title
  document.getElementById('page-title').textContent = title;

  // Page URL (show host + path, drop query/hash)
  try {
    const parsed = new URL(url);
    document.getElementById('page-url').textContent = parsed.hostname + parsed.pathname;
  } catch {
    document.getElementById('page-url').textContent = url;
  }

  // Favicon via Google's public service
  try {
    const origin     = new URL(url).origin;
    const faviconSrc = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
    const img        = document.getElementById('favicon');
    img.onload = () => {
      img.classList.remove('hidden');
      document.getElementById('favicon-placeholder').style.display = 'none';
    };
    img.src = faviconSrc;
  } catch {
    // keep placeholder visible
  }

  show('main-view');

  // ── Save button ────────────────────────────────────────────────────────
  document.getElementById('save-btn').addEventListener('click', () => {
    const shareUrl = buildShareUrl(travelpanelUrl, url, title);
    chrome.tabs.create({ url: shareUrl });
    show('success-view');
    setTimeout(() => window.close(), 1200);
  });

  // ── Open app ───────────────────────────────────────────────────────────
  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: travelpanelUrl });
    window.close();
  });
}

// ── Settings gear ──────────────────────────────────────────────────────────

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function buildShareUrl(base, pageUrl, pageTitle) {
  const clean = base.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl, title: pageTitle });
  return `${clean}/share?${params.toString()}`;
}

// ── Boot ───────────────────────────────────────────────────────────────────

init().catch(console.error);
