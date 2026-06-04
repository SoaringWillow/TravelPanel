const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORMS = {
  youtube:     { label: 'YouTube',     color: '#dc2626', bg: '#fef2f2' },
  instagram:   { label: 'Instagram',   color: '#9333ea', bg: '#fdf4ff' },
  xiaohongshu: { label: '小红书',      color: '#e11d48', bg: '#fff1f2' },
  tiktok:      { label: 'TikTok',      color: '#0f172a', bg: '#f8fafc' },
  douyin:      { label: 'Douyin',      color: '#e11d48', bg: '#fff1f2' },
  bilibili:    { label: 'Bilibili',    color: '#0284c7', bg: '#f0f9ff' },
  twitter:     { label: 'X / Twitter', color: '#0f172a', bg: '#f8fafc' },
  google_maps: { label: 'Google Maps', color: '#1d4ed8', bg: '#eff6ff' },
  tripadvisor: { label: 'TripAdvisor', color: '#047857', bg: '#f0fdf4' },
  web:         { label: 'Web',         color: '#4b5563', bg: '#f9fafb' },
};

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url))        return 'youtube';
  if (/instagram\.com/.test(url))                 return 'instagram';
  if (/xiaohongshu\.com|xhslink\.com/.test(url)) return 'xiaohongshu';
  if (/tiktok\.com/.test(url))                    return 'tiktok';
  if (/douyin\.com/.test(url))                    return 'douyin';
  if (/bilibili\.com/.test(url))                  return 'bilibili';
  if (/twitter\.com|x\.com/.test(url))            return 'twitter';
  if (/maps\.google\.com/.test(url))              return 'google_maps';
  if (/tripadvisor\.com/.test(url))               return 'tripadvisor';
  return 'web';
}

function isRestrictedUrl(url) {
  if (!url) return true;
  const restricted = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://', 'file://'];
  return restricted.some((prefix) => url.startsWith(prefix));
}

async function openInTravelPanel(pageUrl, appUrl) {
  const targetUrl = `${appUrl}/?import=${encodeURIComponent(pageUrl)}`;
  try {
    const origin = new URL(appUrl).origin;
    const existing = await chrome.tabs.query({ url: `${origin}/*` });
    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { url: targetUrl, active: true });
      if (existing[0].windowId != null) {
        await chrome.windows.update(existing[0].windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: targetUrl });
    }
  } catch {
    await chrome.tabs.create({ url: targetUrl });
  }
}

// ── Module-level state shared between init and event listeners ──
let appUrl = DEFAULT_APP_URL;
let pageUrl = '';

async function initMainView() {
  const stored = await chrome.storage.sync.get('appUrl');
  appUrl = stored.appUrl || DEFAULT_APP_URL;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageUrl = tab?.url || '';
  const title = tab?.title || pageUrl;

  const $loading    = document.getElementById('loading');
  const $restricted = document.getElementById('restricted-notice');
  const $sameApp    = document.getElementById('same-app-notice');
  const $clipView   = document.getElementById('clip-view');
  const $badge      = document.getElementById('platform-badge');
  const $title      = document.getElementById('page-title');
  const $url        = document.getElementById('page-url');

  $loading.classList.add('hidden');
  $restricted.classList.add('hidden');
  $sameApp.classList.add('hidden');
  $clipView.classList.add('hidden');

  if (isRestrictedUrl(pageUrl)) {
    $restricted.classList.remove('hidden');
    return;
  }

  try {
    const appOrigin = new URL(appUrl).origin;
    if (pageUrl.startsWith(appOrigin)) {
      $sameApp.classList.remove('hidden');
      return;
    }
  } catch { /* invalid appUrl — fall through */ }

  // Show the clip card
  const platform = detectPlatform(pageUrl);
  const info = PLATFORMS[platform];
  $badge.textContent = info.label;
  $badge.style.color = info.color;
  $badge.style.background = info.bg;
  $title.textContent = title;
  $url.textContent = pageUrl;

  $clipView.classList.remove('hidden');

  // Open-app footer link
  const $openLink = document.getElementById('open-app-link');
  if ($openLink) $openLink.href = appUrl;
}

// ── Event listeners ──

document.getElementById('clip-btn').addEventListener('click', async () => {
  const $btn = document.getElementById('clip-btn');
  $btn.disabled = true;
  $btn.classList.add('success');
  $btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
    </svg>
    Opening TravelPanel…
  `;
  await openInTravelPanel(pageUrl, appUrl);
  setTimeout(() => window.close(), 600);
});

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('main-view').classList.add('hidden');
  document.getElementById('settings-view').classList.remove('hidden');
  document.getElementById('app-url-input').value = appUrl;
});

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
});

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const raw = document.getElementById('app-url-input').value.trim().replace(/\/$/, '');
  if (raw) {
    await chrome.storage.sync.set({ appUrl: raw });
  }
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
  // Re-run init to pick up the new URL
  const $loading = document.getElementById('loading');
  $loading.classList.remove('hidden');
  await initMainView();
});

// ── Bootstrap ──
initMainView().catch(console.error);
