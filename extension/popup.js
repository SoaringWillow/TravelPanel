'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORM_META = {
  xiaohongshu: { label: '小红书', bg: '#ff2442', text: '#fff' },
  douyin:      { label: 'Douyin',    bg: '#010101', text: '#fff' },
  bilibili:    { label: 'Bilibili',  bg: '#00a1d6', text: '#fff' },
  wechat:      { label: 'WeChat',    bg: '#07c160', text: '#fff' },
  instagram:   { label: 'Instagram', bg: '#e1306c', text: '#fff' },
  youtube:     { label: 'YouTube',   bg: '#ff0000', text: '#fff' },
  tiktok:      { label: 'TikTok',    bg: '#010101', text: '#fff' },
  twitter:     { label: 'X / Twitter', bg: '#1d9bf0', text: '#fff' },
  tripadvisor: { label: 'TripAdvisor', bg: '#34e0a1', text: '#111' },
};

function detectPlatform(url) {
  const l = url.toLowerCase();
  if (l.includes('xiaohongshu.com') || l.includes('xhslink.com')) return 'xiaohongshu';
  if (l.includes('douyin.com'))     return 'douyin';
  if (l.includes('bilibili.com'))   return 'bilibili';
  if (l.includes('weixin.qq.com') || l.includes('wechat.com')) return 'wechat';
  if (l.includes('instagram.com'))  return 'instagram';
  if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
  if (l.includes('tiktok.com'))     return 'tiktok';
  if (l.includes('twitter.com') || l.includes('x.com')) return 'twitter';
  if (l.includes('tripadvisor.'))   return 'tripadvisor';
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function getFaviconUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return `${protocol}//${hostname}/favicon.ico`;
  } catch { return null; }
}

function setMain(html) {
  document.getElementById('main').innerHTML = html;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Wire settings buttons
  document.getElementById('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('footerSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Load config
  const { travelPanelUrl = '' } = await chrome.storage.sync.get({ travelPanelUrl: '' });

  if (!travelPanelUrl) {
    renderSetup();
    return;
  }

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  // Block non-web pages
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:') || url.startsWith('moz-extension://')) {
    setMain(`
      <div class="centered-state">
        <span class="state-emoji">🗺️</span>
        <div class="state-title">Navigate to a travel page</div>
        <div class="state-desc">Open any travel website, blog, or social post,<br>then click the TravelPanel icon to clip it.</div>
      </div>
    `);
    return;
  }

  renderPageClip(url, tab.title || getDomain(url), travelPanelUrl);
}

// ── Render: setup prompt ─────────────────────────────────────────────────────

function renderSetup() {
  setMain(`
    <div class="centered-state">
      <span class="state-emoji">🔗</span>
      <div class="state-title">Connect TravelPanel</div>
      <div class="state-desc">
        Enter your TravelPanel URL once and start clipping<br>
        travel inspiration from anywhere on the web.
      </div>
      <button class="primary-btn" id="openSettings">Open Settings</button>
    </div>
  `);
  document.getElementById('openSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// ── Render: page clip UI ─────────────────────────────────────────────────────

function renderPageClip(url, title, travelPanelUrl) {
  const platform = detectPlatform(url);
  const meta     = platform ? PLATFORM_META[platform] : null;
  const domain   = getDomain(url);
  const favicon  = getFaviconUrl(url);

  const badgeHtml = meta
    ? `<div class="platform-badge" style="background:${meta.bg};color:${meta.text}">${meta.label}</div>`
    : '';

  const faviconHtml = favicon
    ? `<img src="${esc(favicon)}" id="favicon" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : '🌐';

  setMain(`
    <div class="page-card">
      <div class="page-favicon-wrap" id="faviconWrap">${faviconHtml}</div>
      <div class="page-info">
        ${badgeHtml}
        <div class="page-title">${esc(title)}</div>
        <div class="page-domain">${esc(domain)}</div>
      </div>
    </div>
    <button class="clip-btn" id="clipBtn">
      <span class="clip-btn-icon">✈️</span>
      Clip to TravelPanel
    </button>
    <div class="error-banner" id="errorBanner"></div>
  `);

  // Favicon error fallback
  const faviconEl = document.getElementById('favicon');
  if (faviconEl) {
    faviconEl.addEventListener('error', () => {
      document.getElementById('faviconWrap').innerHTML = '🌐';
    });
  }

  document.getElementById('clipBtn').addEventListener('click', () => {
    clip(url, title, travelPanelUrl);
  });
}

// ── Clip action ───────────────────────────────────────────────────────────────

async function clip(url, title, travelPanelUrl) {
  const btn     = document.getElementById('clipBtn');
  const errEl   = document.getElementById('errorBanner');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Opening…';
  errEl.style.display = 'none';

  const shareUrl =
    `${travelPanelUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}` +
    `&source=extension`;

  try {
    await chrome.windows.create({
      url: shareUrl,
      type: 'popup',
      width: 440,
      height: 720,
    });
    // Close the popup — the share window takes over
    window.close();
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span class="clip-btn-icon">✈️</span> Clip to TravelPanel';
    errEl.textContent =
      'Could not open TravelPanel. Check your URL in Settings.';
    errEl.style.display = 'block';
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('[TravelPanel Clipper]', err);
  document.getElementById('main').innerHTML = `
    <div class="centered-state">
      <span class="state-emoji">⚠️</span>
      <div class="state-title">Something went wrong</div>
      <div class="state-desc">${esc(err.message)}</div>
    </div>
  `;
});
