'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';
const MAX_RECENT = 10;

let travelPanelUrl = DEFAULT_URL;
let currentTab = null;

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORMS = {
  xiaohongshu: { pattern: /xiaohongshu|xhslink\.com|rednote/i, label: '📕 小红书', color: '#ff2d55' },
  douyin:      { pattern: /douyin\.com|iesdouyin\.com/i,        label: '🎵 抖音',   color: '#161823' },
  bilibili:    { pattern: /bilibili\.com|b23\.tv/i,             label: '📺 Bilibili', color: '#00a1d6' },
  wechat:      { pattern: /mp\.weixin\.qq\.com/i,               label: '💬 WeChat', color: '#07c160' },
  instagram:   { pattern: /instagram\.com/i,                    label: '📸 Instagram', color: '#e1306c' },
  youtube:     { pattern: /youtube\.com|youtu\.be/i,            label: '▶ YouTube', color: '#ff0000' },
  tiktok:      { pattern: /tiktok\.com/i,                       label: '🎵 TikTok',  color: '#010101' },
  tripadvisor: { pattern: /tripadvisor\./i,                     label: '🦉 TripAdvisor', color: '#00af87' },
  googlemaps:  { pattern: /maps\.google\.|google\.com\/maps/i,  label: '🗺 Google Maps', color: '#4285f4' },
  airbnb:      { pattern: /airbnb\./i,                          label: '🏠 Airbnb',  color: '#ff385c' },
};

function detectPlatform(url) {
  if (!url) return null;
  for (const [key, { pattern }] of Object.entries(PLATFORMS)) {
    if (pattern.test(url)) return key;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function timeSince(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderPageCard(tab) {
  document.getElementById('pageTitle').textContent = tab.title || 'Untitled page';
  document.getElementById('pageHost').textContent = hostname(tab.url);

  const platformKey = detectPlatform(tab.url);
  const badge = document.getElementById('platformBadge');
  if (platformKey && PLATFORMS[platformKey]) {
    const { label, color } = PLATFORMS[platformKey];
    badge.textContent = label;
    badge.style.background = color;
    badge.hidden = false;
  }
}

function renderRecentClips(clips) {
  const list = document.getElementById('recentList');
  const clearBtn = document.getElementById('clearRecent');

  if (!clips.length) {
    list.innerHTML = '<p class="empty-state">No clips yet — start clipping travel pages!</p>';
    clearBtn.hidden = true;
    return;
  }

  clearBtn.hidden = false;
  list.innerHTML = clips.map(clip => `
    <div class="recent-item">
      <div class="recent-favicon">
        <img
          src="https://www.google.com/s2/favicons?sz=16&domain=${esc(hostname(clip.url))}"
          alt=""
          onerror="this.style.display='none'"
        >
      </div>
      <div class="recent-info">
        <div class="recent-title" title="${esc(clip.title)}">${esc(clip.title)}</div>
        <div class="recent-host">${esc(hostname(clip.url))} · ${timeSince(clip.clippedAt)}</div>
      </div>
      <button
        class="recent-open-btn"
        data-url="${esc(clip.url)}"
        title="Open in TravelPanel"
        aria-label="Open in TravelPanel"
      >→</button>
    </div>
  `).join('');

  list.querySelectorAll('.recent-open-btn').forEach(btn => {
    btn.addEventListener('click', () => openInApp(btn.dataset.url));
  });
}

// ─── Core actions ─────────────────────────────────────────────────────────────

function openInApp(url) {
  const dest = new URL(travelPanelUrl);
  dest.pathname = '/';
  dest.searchParams.set('import', url);
  chrome.tabs.create({ url: dest.toString() });
}

async function clipPage() {
  if (!currentTab?.url) return;

  const btn = document.getElementById('clipBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span class="btn-label">Opening TravelPanel…</span>';

  // Persist to recent clips
  const { recentClips = [] } = await chrome.storage.sync.get('recentClips');
  const newClip = {
    url: currentTab.url,
    title: currentTab.title || hostname(currentTab.url),
    clippedAt: Date.now(),
  };
  const updated = [newClip, ...recentClips.filter(c => c.url !== currentTab.url)].slice(0, MAX_RECENT);
  await chrome.storage.sync.set({ recentClips: updated });

  // Open TravelPanel
  openInApp(currentTab.url);

  // Success state
  btn.disabled = false;
  btn.className = 'clip-btn success';
  btn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span class="btn-label">Clipped! TravelPanel opened</span>
  `;

  renderRecentClips(updated);

  // Close popup after a beat so user sees the success state
  setTimeout(() => window.close(), 900);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

document.getElementById('settingsToggle').addEventListener('click', () => {
  const panel = document.getElementById('settingsPanel');
  panel.hidden = !panel.hidden;
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const raw = document.getElementById('urlInput').value.trim().replace(/\/+$/, '');
  if (!raw) return;

  let parsed;
  try {
    parsed = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
  } catch {
    document.getElementById('settingsStatus').textContent = '⚠ Invalid URL';
    return;
  }

  travelPanelUrl = parsed.origin;
  document.getElementById('urlInput').value = travelPanelUrl;
  await chrome.storage.sync.set({ travelPanelUrl });

  document.getElementById('settingsStatus').textContent = '✓ Saved';
  document.getElementById('settingsPanel').hidden = true;
  setTimeout(() => { document.getElementById('settingsStatus').textContent = ''; }, 2000);
});

document.getElementById('clipBtn').addEventListener('click', clipPage);

document.getElementById('clearRecent').addEventListener('click', async () => {
  await chrome.storage.sync.set({ recentClips: [] });
  renderRecentClips([]);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const { travelPanelUrl: savedUrl, recentClips = [] } =
    await chrome.storage.sync.get(['travelPanelUrl', 'recentClips']);

  if (savedUrl) travelPanelUrl = savedUrl;
  document.getElementById('urlInput').value = travelPanelUrl;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab) renderPageCard(tab);
  renderRecentClips(recentClips);
}

init();
