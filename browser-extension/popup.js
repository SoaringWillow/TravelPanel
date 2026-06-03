/* global chrome */

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_PATTERNS = [
  { id: 'instagram',     pattern: /instagram\.com/,       label: 'Instagram',     color: '#e1306c' },
  { id: 'youtube',       pattern: /youtube\.com|youtu\.be/, label: 'YouTube',      color: '#ff0000' },
  { id: 'xiaohongshu',   pattern: /xiaohongshu\.com|xhslink\.com|rednote\.com/, label: '小红书', color: '#ff2442' },
  { id: 'tiktok',        pattern: /tiktok\.com/,          label: 'TikTok',        color: '#010101' },
  { id: 'twitter',       pattern: /twitter\.com|x\.com/,  label: 'X / Twitter',  color: '#1da1f2' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6b7280' };
}

// ─── DOM refs ──────────────────────────────────────────────────────────────

const clipView   = document.getElementById('clipView');
const savingView = document.getElementById('savingView');
const doneView   = document.getElementById('doneView');
const errorView  = document.getElementById('errorView');
const noUrlView  = document.getElementById('noUrlView');

const platformChip = document.getElementById('platformChip');
const pageTitle    = document.getElementById('pageTitle');
const pageUrl      = document.getElementById('pageUrl');
const boardChips   = document.getElementById('boardChips');
const clipBtn      = document.getElementById('clipBtn');
const retryBtn     = document.getElementById('retryBtn');
const openAppLink  = document.getElementById('openAppLink');
const doneOpenLink = document.getElementById('doneOpenLink');
const doneSubtext  = document.getElementById('doneSubtext');
const errorMsg     = document.getElementById('errorMsg');
const settingsBtn  = document.getElementById('settingsBtn');

// ─── State ─────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ─── Helpers ────────────────────────────────────────────────────────────────

function show(el) {
  [clipView, savingView, doneView, errorView, noUrlView].forEach(v => {
    v.classList.toggle('hidden', v !== el);
  });
}

function buildShareUrl(tabUrl, tabTitle, appBaseUrl) {
  const params = new URLSearchParams({ url: tabUrl });
  if (tabTitle) params.set('title', tabTitle);
  return `${appBaseUrl}/share?${params.toString()}`;
}

function isClippableUrl(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

// ─── Board chips ─────────────────────────────────────────────────────────────
// Recent boards are stored in chrome.storage.local after each successful clip.

function renderBoardChips(boards) {
  boardChips.innerHTML = '';

  // Inbox chip (always present)
  const inboxChip = document.createElement('button');
  inboxChip.className = 'board-chip inbox';
  inboxChip.textContent = '📥 Inbox';
  inboxChip.addEventListener('click', () => openShare(undefined));
  boardChips.appendChild(inboxChip);

  // Recent boards (up to 4)
  (boards || []).slice(0, 4).forEach(board => {
    const chip = document.createElement('button');
    chip.className = 'board-chip regular';
    chip.textContent = `${board.emoji || ''} ${board.name}`.trim();
    chip.addEventListener('click', () => openShare(board));
    boardChips.appendChild(chip);
  });
}

// ─── Clip action ─────────────────────────────────────────────────────────────

function openShare(board) {
  if (!currentTab?.url || !isClippableUrl(currentTab.url)) return;

  const shareUrl = buildShareUrl(currentTab.url, currentTab.title, appUrl);

  // Pass board id/name as extra params if a board was selected
  const finalUrl = board
    ? shareUrl + `&boardId=${encodeURIComponent(board.id)}&boardName=${encodeURIComponent(board.name)}`
    : shareUrl;

  chrome.tabs.create({ url: finalUrl });
  show(savingView);

  // Store this clip in recent history
  storeRecentClip(currentTab.url, currentTab.title);

  // Close popup shortly after opening the tab
  setTimeout(() => window.close(), 1200);
}

function storeRecentClip(url, title) {
  chrome.storage.local.get(['recentClips'], (data) => {
    const clips = data.recentClips || [];
    clips.unshift({ url, title, ts: Date.now() });
    chrome.storage.local.set({ recentClips: clips.slice(0, 20) });
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL
  const stored = await chrome.storage.sync.get(['appUrl', 'recentBoards']);
  appUrl = stored.appUrl || DEFAULT_APP_URL;

  // Set open-app links
  openAppLink.href = appUrl;
  doneOpenLink.href = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !isClippableUrl(tab?.url)) {
    show(noUrlView);
    return;
  }

  // Populate page info
  const platform = detectPlatform(tab.url);

  platformChip.textContent = platform.label;
  platformChip.style.background = platform.color;

  pageTitle.textContent = tab.title || tab.url;
  pageUrl.textContent   = tab.url;

  // Render board chips from stored recent boards
  renderBoardChips(stored.recentBoards || []);

  // Wire main CTA (defaults to Inbox)
  clipBtn.addEventListener('click', () => openShare(undefined));

  show(clipView);
}

// ─── Settings button ─────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

retryBtn.addEventListener('click', () => {
  show(clipView);
});

// ─── Boot ────────────────────────────────────────────────────────────────────

init().catch((err) => {
  console.error('[TravelPanel]', err);
  errorMsg.textContent = err.message || 'Unknown error.';
  show(errorView);
});
