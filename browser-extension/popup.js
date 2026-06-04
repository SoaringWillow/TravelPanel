// Popup logic — runs in the extension popup context

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORMS = [
  { id: 'instagram',     pattern: /instagram\.com/,                  label: 'Instagram',    color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
  { id: 'youtube',       pattern: /youtube\.com|youtu\.be/,          label: 'YouTube',      color: '#ff0000', bg: 'rgba(255,0,0,0.1)' },
  { id: 'xiaohongshu',   pattern: /xiaohongshu\.com|xhslink\.com/,   label: '小红书',        color: '#fe2c55', bg: 'rgba(254,44,85,0.1)' },
  { id: 'douyin',        pattern: /douyin\.com|tiktok\.com/,         label: 'Douyin/TikTok', color: '#010101', bg: 'rgba(255,255,255,0.08)' },
  { id: 'bilibili',      pattern: /bilibili\.com/,                   label: 'Bilibili',     color: '#00a1d6', bg: 'rgba(0,161,214,0.12)' },
  { id: 'twitter',       pattern: /twitter\.com|x\.com/,             label: 'X/Twitter',    color: '#1da1f2', bg: 'rgba(29,161,242,0.1)' },
  { id: 'tripadvisor',   pattern: /tripadvisor\./,                   label: 'TripAdvisor',  color: '#34e0a1', bg: 'rgba(52,224,161,0.1)' },
  { id: 'airbnb',        pattern: /airbnb\./,                        label: 'Airbnb',       color: '#ff5a5f', bg: 'rgba(255,90,95,0.1)' },
];

function detectPlatform(url) {
  try {
    for (const p of PLATFORMS) {
      if (p.pattern.test(url)) return p;
    }
  } catch (_) {}
  return null;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
      resolve((data.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

function buildShareUrl(appUrl, pageUrl, title) {
  return `${appUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title || '')}`;
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = msg;
  banner.style.display = 'block';
}

function hideError() {
  document.getElementById('errorBanner').style.display = 'none';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab?.url || '';
  const pageTitle = tab?.title || '';

  // Block extension/chrome pages
  const isClippable = pageUrl && !pageUrl.startsWith('chrome://') && !pageUrl.startsWith('chrome-extension://') && !pageUrl.startsWith('about:') && !pageUrl.startsWith('moz-extension://');

  const appUrl = await getAppUrl();
  document.getElementById('openAppLink').href = appUrl;

  if (!isClippable) {
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('normalState').style.display = 'none';
    return;
  }

  // Populate URL and title
  document.getElementById('clipTitle').value = pageTitle;
  document.getElementById('clipUrl').textContent = pageUrl.length > 80
    ? pageUrl.slice(0, 77) + '…'
    : pageUrl;

  // Platform detection
  const platform = detectPlatform(pageUrl);
  const domain = getDomain(pageUrl);

  if (platform) {
    const row = document.getElementById('platformRow');
    const badge = document.getElementById('platformBadge');
    const dot = document.getElementById('platformDot');
    const labelEl = document.getElementById('platformLabel');

    row.style.display = 'flex';
    badge.style.background = platform.bg;
    badge.style.color = platform.color;
    dot.style.background = platform.color;
    labelEl.textContent = platform.label;
    document.getElementById('domainLabel').textContent = domain;
  } else if (domain) {
    const row = document.getElementById('platformRow');
    const badge = document.getElementById('platformBadge');
    const dot = document.getElementById('platformDot');
    const labelEl = document.getElementById('platformLabel');

    row.style.display = 'flex';
    badge.style.background = 'rgba(148,163,184,0.12)';
    badge.style.color = '#94a3b8';
    dot.style.background = '#94a3b8';
    labelEl.textContent = domain;
    document.getElementById('domainLabel').style.display = 'none';
  }

  // Clip button handler
  document.getElementById('clipBtn').addEventListener('click', async () => {
    const title = document.getElementById('clipTitle').value.trim();
    const url = pageUrl;
    hideError();

    if (!url) {
      showError('No URL found for this page.');
      return;
    }

    // Show loading state
    const btn = document.getElementById('clipBtn');
    const btnText = document.getElementById('clipBtnText');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Opening…</span>';

    try {
      const shareUrl = buildShareUrl(appUrl, url, title);
      await chrome.tabs.create({ url: shareUrl });

      // Show success
      document.getElementById('normalState').style.display = 'none';
      document.getElementById('successState').style.display = 'flex';

      // Auto-close after 1.5s
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span>Clip to TravelPanel</span>
      `;
      showError('Failed to open TravelPanel. Check your settings.');
    }
  });

  // Settings button
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
