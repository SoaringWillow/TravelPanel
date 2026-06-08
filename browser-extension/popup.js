'use strict';

// ─── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_PATTERNS = [
  { key: 'instagram',    pattern: /instagram\.com/,             label: 'Instagram',    emoji: '📸' },
  { key: 'youtube',      pattern: /youtube\.com|youtu\.be/,     label: 'YouTube',      emoji: '▶️' },
  { key: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink/,  label: '小红书',        emoji: '📕' },
  { key: 'tiktok',       pattern: /tiktok\.com/,                label: 'TikTok',       emoji: '🎵' },
  { key: 'douyin',       pattern: /douyin\.com/,                label: '抖音',          emoji: '🎵' },
  { key: 'bilibili',     pattern: /bilibili\.com/,              label: 'Bilibili',     emoji: '📺' },
  { key: 'tripadvisor',  pattern: /tripadvisor\./,              label: 'TripAdvisor',  emoji: '🦉' },
  { key: 'airbnb',       pattern: /airbnb\./,                   label: 'Airbnb',       emoji: '🏠' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return { key: 'web', label: 'Web', emoji: '🌐' };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── State ─────────────────────────────────────────────────────────────────────

let currentTab = null;
let pageMeta   = null;  // { title, description, image, url }
let tpUrl      = '';    // TravelPanel deployment URL (from chrome.storage)
let boards     = [];    // [{ id, name, emoji }]

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const setupPrompt      = document.getElementById('setup-prompt');
const clipUi           = document.getElementById('clip-ui');
const successState     = document.getElementById('success-state');
const footerEl         = document.getElementById('footer');
const previewTitle     = document.getElementById('preview-title');
const previewDomain    = document.getElementById('preview-domain');
const previewThumb     = document.getElementById('preview-thumb');
const platformWrapper  = document.getElementById('platform-badge-wrapper');
const boardSelect      = document.getElementById('board-select');
const btnClip          = document.getElementById('btn-clip');
const errorMsg         = document.getElementById('error-msg');
const successSub       = document.getElementById('success-sub');
const successLink      = document.getElementById('success-link');

// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Load settings
  const stored = await chrome.storage.local.get(['tpUrl', 'boards']);
  tpUrl  = (stored.tpUrl  || '').trim().replace(/\/$/, '');
  boards = stored.boards || [];

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tpUrl) {
    setupPrompt.style.display = 'block';
    return;
  }

  clipUi.style.display  = 'block';
  footerEl.style.display = 'flex';

  // Populate board selector
  populateBoards();

  // Try to get page metadata from content script
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_META' });
    pageMeta = result;
  } catch {
    // Content script not ready — use tab info as fallback
    pageMeta = { title: tab.title, description: '', image: tab.favIconUrl || '', url: tab.url };
  }

  renderPreview();
}

function populateBoards() {
  boardSelect.innerHTML = '<option value="">📥 Inbox</option>';
  for (const board of boards) {
    const opt = document.createElement('option');
    opt.value = board.id || board.name;
    opt.textContent = `${board.emoji || '📋'} ${board.name}`;
    boardSelect.appendChild(opt);
  }
}

function renderPreview() {
  if (!pageMeta) return;

  const title = pageMeta.title || currentTab?.title || 'Untitled page';
  const url   = pageMeta.url   || currentTab?.url   || '';

  previewTitle.textContent  = truncate(title, 80);
  previewDomain.textContent = getDomain(url);

  // Thumbnail
  if (pageMeta.image) {
    const img = document.createElement('img');
    img.src = pageMeta.image;
    img.alt = '';
    img.onerror = () => {
      previewThumb.textContent = '🌍';
    };
    previewThumb.innerHTML = '';
    previewThumb.appendChild(img);
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform.key !== 'web') {
    const badge = document.createElement('div');
    badge.className = `platform-badge ${platform.key}`;
    badge.textContent = `${platform.emoji} ${platform.label}`;
    platformWrapper.appendChild(badge);
  }
}

// ─── Clip action ──────────────────────────────────────────────────────────────

btnClip.addEventListener('click', async () => {
  const url   = pageMeta?.url   || currentTab?.url   || '';
  const title = pageMeta?.title || currentTab?.title || '';

  if (!url) {
    showError('No URL found on this page.');
    return;
  }

  setLoading(true);

  try {
    const shareUrl = buildShareUrl(url, title);

    // Open TravelPanel share page in a new tab (or focus existing one)
    const tabs = await chrome.tabs.query({ url: `${tpUrl}/*` });
    const tpTab = tabs.find(t => t.url?.includes('/share'));

    if (tpTab) {
      // Reuse existing share tab
      await chrome.tabs.update(tpTab.id, { url: shareUrl, active: true });
      await chrome.windows.update(tpTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: shareUrl, active: true });
    }

    // Persist to recent clips in extension storage
    await saveRecentClip({ url, title, domain: getDomain(url), clippedAt: Date.now() });

    showSuccess(title);
  } catch (err) {
    setLoading(false);
    showError('Could not open TravelPanel. Check your URL in settings.');
  }
});

function buildShareUrl(url, title) {
  const params = new URLSearchParams({ url });
  if (title) params.set('title', title);
  return `${tpUrl}/share?${params.toString()}`;
}

async function saveRecentClip(clip) {
  const stored = await chrome.storage.local.get('recentClips');
  const recent = stored.recentClips || [];
  recent.unshift(clip);
  await chrome.storage.local.set({ recentClips: recent.slice(0, 20) });
}

// ─── UI state helpers ─────────────────────────────────────────────────────────

function setLoading(on) {
  btnClip.disabled = on;
  if (on) {
    btnClip.innerHTML = `<div class="spinner"></div> Clipping…`;
  } else {
    btnClip.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      Clip This Page`;
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  setTimeout(() => errorMsg.classList.remove('visible'), 4000);
}

function showSuccess(title) {
  clipUi.style.display  = 'none';
  footerEl.style.display = 'none';
  successState.classList.add('visible');
  successSub.textContent = `"${truncate(title, 40)}" saved to TravelPanel`;
  successLink.href = tpUrl;
  successLink.addEventListener('click', () => chrome.tabs.create({ url: tpUrl }));
  setTimeout(() => window.close(), 2800);
}

// ─── Settings button ──────────────────────────────────────────────────────────

document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

document.getElementById('btn-open-options')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init().catch(console.error);
