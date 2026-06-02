// ─── Platform detection (mirrors lib/parse-url.ts) ────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin/.test(url)) return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com|tiktok\.com/.test(url)) return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'X / Twitter',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#FF0050',
  bilibili: '#00AEEC',
  instagram: '#E1306C',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  other: '#6366F1',
};

// Platforms we consider likely travel-related content
const TRAVEL_PLATFORMS = new Set(['xiaohongshu', 'instagram', 'youtube', 'douyin', 'bilibili']);

// ─── Default seed boards (shown when no saved boards exist) ───────────────

const DEFAULT_BOARDS = [
  { id: '__inbox__', name: 'Inbox', emoji: '📥', count: 0 },
];

// ─── State ─────────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';
let selectedBoardId = '__inbox__';
let appBaseUrl = 'https://travel-panel.vercel.app'; // overridden by saved setting

// ─── DOM refs ──────────────────────────────────────────────────────────────

const platformBadge  = document.getElementById('platformBadge');
const platformLabel  = document.getElementById('platformLabel');
const pageTitle      = document.getElementById('pageTitle');
const pageUrl        = document.getElementById('pageUrl');
const travelHint     = document.getElementById('travelHint');
const boardList      = document.getElementById('boardList');
const clipBtn        = document.getElementById('clipBtn');
const mainContent    = document.getElementById('mainContent');
const successState   = document.getElementById('successState');
const successSub     = document.getElementById('successSub');
const openAppBtn     = document.getElementById('openAppBtn');
const settingsBtn    = document.getElementById('settingsBtn');

// ─── Init ──────────────────────────────────────────────────────────────────

async function init() {
  // Load saved settings
  const stored = await chrome.storage.sync.get(['appBaseUrl', 'boards', 'recentBoardId']);
  if (stored.appBaseUrl) appBaseUrl = stored.appBaseUrl;
  if (stored.recentBoardId) selectedBoardId = stored.recentBoardId;

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl   = tab?.url   ?? '';
  currentTitle = tab?.title ?? '';

  // Render page info
  const platform = detectPlatform(currentUrl);
  const color    = PLATFORM_COLORS[platform];

  platformBadge.style.background = color;
  platformLabel.textContent       = PLATFORM_LABELS[platform];
  pageTitle.textContent           = currentTitle || 'Untitled page';
  pageUrl.textContent             = currentUrl;

  // Show non-travel hint if needed
  const isTravelPlatform = TRAVEL_PLATFORMS.has(platform);
  const looksLikeTravel  = /travel|trip|tour|hotel|resort|hostel|itinerary|hiking|flight|beach|mountain/i.test(currentTitle);
  if (!isTravelPlatform && !looksLikeTravel) {
    travelHint.style.display = 'flex';
  }

  // Build board list (saved boards or defaults)
  const boards = stored.boards ?? DEFAULT_BOARDS;
  renderBoards(boards);
}

// ─── Board rendering ───────────────────────────────────────────────────────

function renderBoards(boards) {
  boardList.innerHTML = '';

  // Always include Inbox at top
  const allBoards = boards.some(b => b.id === '__inbox__')
    ? boards
    : [{ id: '__inbox__', name: 'Inbox', emoji: '📥', count: 0 }, ...boards];

  allBoards.slice(0, 5).forEach(board => {
    const el = document.createElement('div');
    el.className = `board-item${board.id === '__inbox__' ? ' inbox-item' : ''}${board.id === selectedBoardId ? ' selected' : ''}`;
    el.dataset.id = board.id;

    el.innerHTML = `
      <span class="board-emoji">${board.emoji ?? '📌'}</span>
      <span class="board-name">${escHtml(board.name)}</span>
      <span class="board-count">${board.count ?? 0}</span>
      <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;

    el.addEventListener('click', () => {
      document.querySelectorAll('.board-item').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      selectedBoardId = board.id;
    });

    boardList.appendChild(el);
  });
}

// ─── Clip action ───────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  clipBtn.disabled = true;
  clipBtn.innerHTML = `<div class="spinner"></div> Clipping…`;

  try {
    // Save the recent board choice
    await chrome.storage.sync.set({ recentBoardId: selectedBoardId });

    // Build the share URL
    const params = new URLSearchParams({
      url:   currentUrl,
      title: currentTitle,
    });
    if (selectedBoardId && selectedBoardId !== '__inbox__') {
      params.set('boardId', selectedBoardId);
    }

    const shareUrl = `${appBaseUrl}/share?${params.toString()}`;

    // Open in a new tab
    await chrome.tabs.create({ url: shareUrl });

    // Show success
    mainContent.style.display    = 'none';
    successState.style.display   = 'flex';
    const boardName = boardList.querySelector('.selected .board-name')?.textContent ?? 'Inbox';
    successSub.textContent        = `Saved to ${boardName}`;
  } catch (err) {
    clipBtn.disabled = false;
    clipBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      Clip to TravelPanel`;
    console.error('TravelPanel clip error:', err);
  }
});

openAppBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: appBaseUrl });
  window.close();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ──────────────────────────────────────────────────────────────────

init().catch(console.error);
