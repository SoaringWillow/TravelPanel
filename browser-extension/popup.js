const PLATFORM_PATTERNS = {
  instagram: /instagram\.com/i,
  youtube: /youtube\.com|youtu\.be/i,
  tiktok: /tiktok\.com/i,
  xiaohongshu: /xiaohongshu\.com|xhslink\.com|rednote\.com/i,
  twitter: /twitter\.com|x\.com/i,
  pinterest: /pinterest\.com/i,
  tripadvisor: /tripadvisor\.com/i,
};

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  xiaohongshu: 'Xiaohongshu',
  twitter: 'Twitter/X',
  pinterest: 'Pinterest',
  tripadvisor: 'TripAdvisor',
  other: 'Web',
};

const PLATFORM_COLORS = {
  instagram: '#e1306c',
  youtube: '#ff0000',
  tiktok: '#010101',
  xiaohongshu: '#fe2c55',
  twitter: '#1da1f2',
  pinterest: '#e60023',
  tripadvisor: '#34e0a1',
  other: '#6366f1',
};

function detectPlatform(url) {
  for (const [key, re] of Object.entries(PLATFORM_PATTERNS)) {
    if (re.test(url)) return key;
  }
  return 'other';
}

function showState(id) {
  const states = ['state-loading', 'state-no-url', 'state-no-config', 'state-success', 'state-main'];
  for (const s of states) {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? (s === 'state-main' ? 'block' : 'flex') : 'none';
  }
}

async function getStoredBoards() {
  return new Promise((resolve) => {
    chrome.storage.local.get('recentBoards', (result) => {
      resolve(result.recentBoards || []);
    });
  });
}

async function storeRecentBoard(board) {
  const boards = await getStoredBoards();
  const filtered = boards.filter((b) => b.id !== board.id);
  const updated = [board, ...filtered].slice(0, 5);
  chrome.storage.local.set({ recentBoards: updated });
}

async function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('travelPanelUrl', (result) => {
      resolve(result.travelPanelUrl || '');
    });
  });
}

async function init() {
  showState('state-loading');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';

  // Check for non-web pages (chrome://, about:, etc.)
  if (!url || !url.startsWith('http')) {
    showState('state-no-url');
    return;
  }

  // Check TravelPanel URL is configured
  const tpUrl = await getTravelPanelUrl();
  if (!tpUrl) {
    showState('state-no-config');
    document.getElementById('btn-open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  // Detect platform
  const platform = detectPlatform(url);
  const badge = document.getElementById('platform-badge');
  badge.textContent = PLATFORM_LABELS[platform] || 'Web';
  badge.style.background = PLATFORM_COLORS[platform] || '#6366f1';

  // Fill page preview
  document.getElementById('page-title').textContent = title || url;
  document.getElementById('page-url').textContent = url;

  // Load recent boards
  const recentBoards = await getStoredBoards();
  if (recentBoards.length > 0) {
    const boardRow = document.getElementById('board-row');
    boardRow.innerHTML = '<button class="board-btn inbox" data-board-id="" data-board-name="Inbox">📥 Inbox</button>';
    for (const board of recentBoards) {
      const btn = document.createElement('button');
      btn.className = 'board-btn recent';
      btn.dataset.boardId = board.id;
      btn.dataset.boardName = board.name;
      btn.textContent = `${board.emoji || '📍'} ${board.name}`;
      boardRow.appendChild(btn);
    }
    document.getElementById('boards-section').style.display = 'block';
  }

  showState('state-main');

  // ── Save button ──────────────────────────────────────────────────────────
  document.getElementById('btn-save').addEventListener('click', () => {
    save(tpUrl, url, title, '', 'Inbox');
  });

  // ── Board chip clicks ────────────────────────────────────────────────────
  document.getElementById('board-row')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-board-name]');
    if (!btn) return;
    const boardId = btn.dataset.boardId || '';
    const boardName = btn.dataset.boardName || 'Inbox';
    save(tpUrl, url, title, boardId, boardName);
  });

  // ── Settings ─────────────────────────────────────────────────────────────
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function save(tpUrl, url, title, boardId, boardName) {
  const shareUrl = new URL('/share', tpUrl);
  shareUrl.searchParams.set('url', url);
  if (title) shareUrl.searchParams.set('title', title);
  if (boardId) shareUrl.searchParams.set('boardId', boardId);

  // Open share page in new tab
  chrome.tabs.create({ url: shareUrl.toString() });

  // Remember this board for next time (skip Inbox)
  if (boardId) {
    storeRecentBoard({ id: boardId, name: boardName, emoji: '📍' });
  }

  // Show success state briefly, then close
  const successTitle = document.getElementById('success-title');
  const successSub = document.getElementById('success-sub');
  successTitle.textContent = `Opening TravelPanel…`;
  successSub.textContent = `Saving to ${boardName}`;
  showState('state-success');
  setTimeout(() => window.close(), 1200);
}

init().catch((err) => {
  console.error('[TravelPanel Clipper]', err);
  showState('state-no-url');
});
