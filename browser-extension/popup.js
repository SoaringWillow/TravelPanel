'use strict';

// Platform detection (mirrors lib/parse-url.ts logic)
const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  youtube:   { label: 'YouTube',   color: '#FF0000' },
  xiaohongshu: { label: '小红书',   color: '#FF2442' },
  tiktok:    { label: 'TikTok',    color: '#010101' },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2' },
  pinterest: { label: 'Pinterest', color: '#E60023' },
  other:     { label: 'Web',       color: '#6B7280' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/instagram\.com/i.test(url))      return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/xiaohongshu\.com|xhslink\.com|x\.xiaohongshu\.com/i.test(url)) return 'xiaohongshu';
  if (/tiktok\.com/i.test(url))         return 'tiktok';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/pinterest\.com/i.test(url))      return 'pinterest';
  return 'other';
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const setupPrompt  = document.getElementById('setup-prompt');
const platformBadge = document.getElementById('platform-badge');
const pageTitleEl  = document.getElementById('page-title');
const pageUrlEl    = document.getElementById('page-url');
const clipBtn      = document.getElementById('clip-btn');
const settingsBtn  = document.getElementById('settings-btn');
const mainBody     = document.getElementById('main-body');

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = '';

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL
  const stored = await chrome.storage.sync.get('appUrl');
  appUrl = (stored.appUrl || '').replace(/\/$/, '');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const url   = tab?.url   || '';
  const title = tab?.title || url;

  // Update page card
  const platform = detectPlatform(url);
  const cfg = PLATFORM_CONFIG[platform];
  platformBadge.textContent = cfg.label;
  platformBadge.style.background = cfg.color;
  pageTitleEl.textContent = title || '(no title)';
  pageUrlEl.textContent   = url;

  // Show setup prompt if URL not configured
  if (!appUrl) {
    setupPrompt.style.display = 'block';
    clipBtn.disabled = true;
  }
}

// ─── Clip handler ─────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!appUrl || !currentTab) return;

  const url   = currentTab.url   || '';
  const title = currentTab.title || '';

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Open as a small popup window — like a mini share sheet
  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: 420,
    height: 580,
    focused: true,
  });

  // Show brief success feedback then close popup
  mainBody.innerHTML = `
    <div class="success">
      <div class="success-icon">✈️</div>
      <div class="success-title">Opening TravelPanel…</div>
      <div class="success-sub">Select a board in the window that just opened.</div>
    </div>
  `;

  setTimeout(() => window.close(), 1800);
});

// ─── Settings button ──────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ─── Start ────────────────────────────────────────────────────────────────────

init().catch(console.error);
