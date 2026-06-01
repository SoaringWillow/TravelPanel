'use strict';

const DEFAULT_TRAVELPANEL_URL = 'https://your-app.vercel.app';

// Platform detection mirrors the app's logic
const PLATFORM_PATTERNS = [
  { pattern: /instagram\.com/i,      label: 'Instagram',    bg: '#e1306c', fg: '#fff' },
  { pattern: /youtube\.com|youtu\.be/i, label: 'YouTube',   bg: '#ff0000', fg: '#fff' },
  { pattern: /xiaohongshu\.com|xhslink\.com/i, label: 'Xiaohongshu', bg: '#ff2442', fg: '#fff' },
  { pattern: /tiktok\.com/i,         label: 'TikTok',       bg: '#010101', fg: '#fff' },
  { pattern: /twitter\.com|x\.com/i, label: 'Twitter/X',   bg: '#1da1f2', fg: '#fff' },
  { pattern: /pinterest\.com/i,      label: 'Pinterest',    bg: '#e60023', fg: '#fff' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return { label: 'Web', bg: '#6366f1', fg: '#fff' };
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelpanelUrl'], (result) => {
      resolve({ travelpanelUrl: result.travelpanelUrl || DEFAULT_TRAVELPANEL_URL });
    });
  });
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function renderMain(html) {
  document.getElementById('main').innerHTML = html;
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen).trimEnd() + '…';
}

async function init() {
  const [tab, settings] = await Promise.all([getCurrentTab(), getSettings()]);

  // Settings button → options page
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // No tab / no URL
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    renderMain(`
      <div class="no-url">
        <span class="emoji">🗺️</span>
        Navigate to a travel page<br>to clip it into TravelPanel.
      </div>
    `);
    return;
  }

  const url = tab.url;
  const title = tab.title || url;
  const platform = detectPlatform(url);
  const isSetup = settings.travelpanelUrl !== DEFAULT_TRAVELPANEL_URL;

  let setupWarning = '';
  if (!isSetup) {
    setupWarning = `
      <div class="setup-required">
        <p><strong>Setup required:</strong> Open Settings and paste your TravelPanel URL to start clipping.</p>
      </div>
    `;
  }

  renderMain(`
    <div class="meta">
      <span class="platform-chip" style="background:${platform.bg};color:${platform.fg}">
        ${platform.label}
      </span>
      <div class="page-title">${escapeHtml(truncate(title, 80))}</div>
      <div class="page-url">${escapeHtml(truncate(url, 60))}</div>
    </div>
    ${setupWarning}
    <div class="actions">
      <button class="clip-btn" id="clipBtn" ${!isSetup ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Clip to TravelPanel
      </button>
    </div>
    <div class="footer">
      <span class="hint">AI will extract spots + tips</span>
      <button class="open-app-link" id="openAppBtn">Open app ↗</button>
    </div>
  `);

  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: settings.travelpanelUrl });
    window.close();
  });

  if (!isSetup) return;

  document.getElementById('clipBtn').addEventListener('click', async () => {
    const shareUrl = `${settings.travelpanelUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&source=extension`;

    // Open share page in a new tab
    chrome.tabs.create({ url: shareUrl });

    // Show brief confirmation then close
    renderMain(`
      <div class="clipped-state">
        <div class="check">✅</div>
        <h2>Clipped!</h2>
        <p>${escapeHtml(truncate(title, 50))}</p>
        <p style="margin-top:4px;font-size:11px;color:#9ca3af">AI is extracting spots &amp; tips…</p>
      </div>
    `);
    setTimeout(() => window.close(), 1400);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init().catch(console.error);
