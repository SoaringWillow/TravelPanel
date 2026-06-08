const DEFAULT_APP_URL = 'http://localhost:3000';

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('instagram.com'))      return { label: 'Instagram',    cls: 'platform-instagram',   icon: '📸' };
  if (url.includes('youtube.com') || url.includes('youtu.be'))
                                          return { label: 'YouTube',      cls: 'platform-youtube',     icon: '▶️' };
  if (url.includes('tiktok.com'))         return { label: 'TikTok',       cls: 'platform-tiktok',      icon: '🎵' };
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com'))
                                          return { label: '小红书',        cls: 'platform-xiaohongshu', icon: '📕' };
  if (url.includes('pinterest.com'))      return { label: 'Pinterest',    cls: 'platform-web',         icon: '📌' };
  if (url.includes('maps.google.com') || url.includes('maps.apple.com'))
                                          return { label: 'Maps',         cls: 'platform-web',         icon: '🗺️' };
  return { label: 'Web', cls: 'platform-web', icon: '🌐' };
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 27) + '…' : u.pathname;
    return u.hostname + path;
  } catch (_) {
    return url.slice(0, 50);
  }
}

// ── State ────────────────────────────────────────────────────────────────────

let currentUrl  = '';
let currentTitle = '';
let selectedBoard = null; // { id, name } | null means "Quick Saves"
let appUrl = DEFAULT_APP_URL;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const pageTitleEl  = document.getElementById('pageTitle');
const pageUrlEl    = document.getElementById('pageUrl');
const platformBadge = document.getElementById('platformBadge');
const boardListEl  = document.getElementById('boardList');
const clipBtn      = document.getElementById('clipBtn');
const noteInput    = document.getElementById('noteInput');
const mainView     = document.getElementById('mainView');
const successView  = document.getElementById('successView');
const successMsg   = document.getElementById('successMsg');
const openAppBtn   = document.getElementById('openAppBtn');
const settingsBtn  = document.getElementById('settingsBtn');

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load stored appUrl
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl: stored }) => {
    appUrl = stored.replace(/\/$/, '');
  });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl   = tab?.url   || '';
  currentTitle = tab?.title || '';

  // Render preview
  pageTitleEl.textContent = currentTitle || 'Untitled page';
  pageUrlEl.textContent   = truncateUrl(currentUrl);

  const platform = detectPlatform(currentUrl);
  if (platform) {
    platformBadge.innerHTML = `
      <span class="preview-platform ${platform.cls}">
        <span>${platform.icon}</span>
        <span>${platform.label}</span>
      </span>`;
  }

  // Load boards from storage (IndexedDB is in the app; extension mirrors them via storage.local)
  loadBoards();
  clipBtn.disabled = false;
}

// ── Boards ───────────────────────────────────────────────────────────────────

function renderBoardChips(boards) {
  boardListEl.innerHTML = '';

  // "Quick Saves" default
  const defaultChip = makeChip({ id: null, name: '📥 Quick Saves' }, selectedBoard === null);
  boardListEl.appendChild(defaultChip);

  boards.forEach(b => {
    boardListEl.appendChild(makeChip(b, selectedBoard?.id === b.id));
  });

  // New board chip
  const newChip = document.createElement('button');
  newChip.className = 'board-chip board-chip-new';
  newChip.textContent = '+ New board';
  newChip.addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}/?newBoard=1` });
    window.close();
  });
  boardListEl.appendChild(newChip);
}

function makeChip(board, selected) {
  const chip = document.createElement('button');
  chip.className = 'board-chip' + (selected ? ' selected' : '');
  chip.textContent = board.name;
  chip.addEventListener('click', () => {
    selectedBoard = board.id !== null ? board : null;
    document.querySelectorAll('.board-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
  return chip;
}

function loadBoards() {
  // Boards are stored in chrome.storage.local by the companion content-script
  // or by the TravelPanel app itself via postMessage when open.
  // Fall back to a sensible default if none are cached yet.
  chrome.storage.local.get({ boards: [] }, ({ boards }) => {
    if (boards.length > 0) {
      renderBoardChips(boards);
    } else {
      // No cached boards yet — show just the default
      renderBoardChips([]);
    }
  });
}

// ── Clip action ──────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  clipBtn.disabled = true;
  clipBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Saving…`;

  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  const params = new URLSearchParams({
    url:   currentUrl,
    title: currentTitle,
  });
  if (selectedBoard?.id) params.set('boardId', selectedBoard.id);
  const note = noteInput.value.trim();
  if (note) params.set('note', note);

  // Open the share page in TravelPanel in a new tab
  const shareUrl = `${appUrl}/share?${params.toString()}`;
  await chrome.tabs.create({ url: shareUrl });

  // Show success
  mainView.classList.add('hidden');
  successView.classList.add('visible');
  successMsg.textContent = selectedBoard
    ? `Saved to "${selectedBoard.name}".\nClaude is extracting wisdom from this post…`
    : 'Saved to Quick Saves.\nClaude is extracting wisdom from this post…';

  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
});

// ── Settings ─────────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Start ─────────────────────────────────────────────────────────────────────

init();
