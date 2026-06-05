'use strict';

// ─── Platform detection ─────────────────────────────────────────────────────

const PLATFORMS = {
  instagram: { label: 'Instagram', color: '#E1306C', emoji: '📸' },
  youtube:   { label: 'YouTube',   color: '#FF0000', emoji: '🎬' },
  xiaohongshu: { label: '小红书', color: '#FE2C55', emoji: '📕' },
  douyin:    { label: 'TikTok',    color: '#010101', emoji: '🎵' },
  bilibili:  { label: 'Bilibili',  color: '#00A1D6', emoji: '📺' },
  twitter:   { label: 'X / Twitter', color: '#1DA1F2', emoji: '🐦' },
  pinterest: { label: 'Pinterest', color: '#E60023', emoji: '📌' },
  other:     { label: 'Web',       color: '#6366f1', emoji: '🌐' },
};

function detectPlatform(url) {
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/xiaohongshu\.com|xhslink\.com/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|tiktok\.com/.test(url)) return 'douyin';
  if (/bilibili\.com/.test(url)) return 'bilibili';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/pinterest\.com/.test(url)) return 'pinterest';
  return 'other';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function friendlyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + u.pathname.slice(0, 30);
  } catch {
    return url.slice(0, 40);
  }
}

// ─── Render functions ────────────────────────────────────────────────────────

function renderSetup() {
  return `
    <div class="setup-screen">
      <div class="emoji">🗺️</div>
      <h2>Almost ready!</h2>
      <p>Enter your TravelPanel app URL in settings to start clipping travel inspiration with one click.</p>
      <button class="btn-setup" id="open-options">Configure TravelPanel URL →</button>
    </div>
  `;
}

function renderMain(url, title, platform) {
  const p = PLATFORMS[platform] || PLATFORMS.other;
  const displayTitle = title || 'Untitled page';

  return `
    <div class="page-info">
      <div class="platform-chip" style="background:${esc(p.color)}">
        ${esc(p.emoji)} ${esc(p.label)}
      </div>
      <div class="page-title">${esc(truncate(displayTitle, 80))}</div>
      <div class="page-url">${esc(friendlyUrl(url))}</div>
    </div>

    <div class="save-section">
      <button class="btn-save" id="btn-save">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save to TravelPanel
      </button>
      <button class="btn-open" id="btn-open">Open full view to pick a board</button>
    </div>
    <div class="error-msg" id="error-msg" style="display:none"></div>
  `;
}

function renderSuccess(savedTo, appUrl) {
  return `
    <div class="success-screen">
      <div class="success-icon">✅</div>
      <div class="success-title">Saved to ${esc(savedTo)}!</div>
      <div class="success-subtitle">AI extraction running in the background…</div>
      <button class="btn-view" id="btn-view-app">Open TravelPanel →</button>
    </div>
  `;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const content = document.getElementById('content');
  const settingsBtn = document.getElementById('settings-btn');

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Load app URL from storage
  const { travelPanelUrl } = await chrome.storage.sync.get(['travelPanelUrl']);

  if (!travelPanelUrl) {
    content.innerHTML = renderSetup();
    document.getElementById('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';
  const platform = detectPlatform(url);

  content.innerHTML = renderMain(url, title, platform);

  // ── Save button: open share page in new tab ────────────────
  document.getElementById('btn-save').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Opening TravelPanel…';

    const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // ── Open full view ─────────────────────────────────────────
  document.getElementById('btn-open').addEventListener('click', async () => {
    const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl });
    window.close();
  });
}

main().catch((err) => {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="error-msg" style="display:block;padding:16px">
    Something went wrong: ${esc(err.message)}
  </div>`;
});
