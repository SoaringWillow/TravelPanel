'use strict';

// ── Platform detection (mirrors lib/parse-url.ts logic) ──────────────────────

const PLATFORM_META = {
  instagram:    { label: 'Instagram',    color: '#E1306C' },
  youtube:      { label: 'YouTube',      color: '#FF0000' },
  tiktok:       { label: 'TikTok',       color: '#010101' },
  xiaohongshu:  { label: 'Xiaohongshu', color: '#FF2442' },
  twitter:      { label: 'X / Twitter',  color: '#1DA1F2' },
  pinterest:    { label: 'Pinterest',    color: '#E60023' },
  tripadvisor:  { label: 'TripAdvisor',  color: '#34E0A1' },
  other:        { label: 'Web',          color: '#6366f1' },
};

function detectPlatform(url) {
  if (/instagram\.com/.test(url))                        return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url))                return 'youtube';
  if (/tiktok\.com/.test(url))                           return 'tiktok';
  if (/xiaohongshu\.com|xhslink\.com|rednote\.com/.test(url)) return 'xiaohongshu';
  if (/twitter\.com|x\.com/.test(url))                   return 'twitter';
  if (/pinterest\.com/.test(url))                        return 'pinterest';
  if (/tripadvisor\.com/.test(url))                      return 'tripadvisor';
  return 'other';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function $(id) { return document.getElementById(id); }

function render(html) {
  $('content').innerHTML = html;
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function getStoredUrl() {
  const result = await chrome.storage.sync.get(['travelPanelUrl']);
  return (result.travelPanelUrl || '').replace(/\/$/, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  const [tabs, baseUrl] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    getStoredUrl(),
  ]);

  const tab = tabs[0] || {};

  if (!baseUrl) {
    renderSetup();
    return;
  }

  renderMain(tab, baseUrl);
}

// ── Views ─────────────────────────────────────────────────────────────────────

function renderSetup() {
  render(`
    <div class="setup">
      <div class="setup-icon">🗺️</div>
      <h2>Welcome to TravelPanel Clipper</h2>
      <p>Enter your TravelPanel URL once and start saving travel inspiration from anywhere on the web.</p>
      <button class="setup-btn" id="open-options">Get Started</button>
    </div>
  `);
  $('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function renderMain(tab, baseUrl) {
  const url      = tab.url   || '';
  const title    = tab.title || 'Untitled page';
  const platform = detectPlatform(url);
  const meta     = PLATFORM_META[platform];
  const displayBase = baseUrl.replace(/^https?:\/\//, '');

  render(`
    <div class="body">
      <span class="chip" style="background:${escHtml(meta.color)}">${escHtml(meta.label)}</span>
      <div class="preview-card">
        <div class="preview-title">${escHtml(title)}</div>
        <div class="preview-url">${escHtml(url)}</div>
      </div>

      <button class="save-btn" id="save-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save to TravelPanel
      </button>

      <div class="footer">
        <span class="footer-url">${escHtml(displayBase)}</span>
        <button class="footer-settings" id="settings-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </div>
    </div>
  `);

  $('save-btn').addEventListener('click', () => {
    const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  $('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

init();
