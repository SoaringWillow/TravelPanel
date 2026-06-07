// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_PATTERNS = {
  instagram:    /instagram\.com/i,
  youtube:      /youtube\.com|youtu\.be/i,
  xiaohongshu:  /xiaohongshu\.com|xhslink\.com/i,
  douyin:       /douyin\.com|tiktok\.com/i,
  bilibili:     /bilibili\.com/i,
  twitter:      /twitter\.com|x\.com/i,
  pinterest:    /pinterest\.com/i,
  tripadvisor:  /tripadvisor\.com/i,
  booking:      /booking\.com/i,
  airbnb:       /airbnb\.com/i,
};

const PLATFORM_META = {
  instagram:   { label: 'Instagram',   color: '#e1306c', bg: '#fce4ec' },
  youtube:     { label: 'YouTube',     color: '#ff0000', bg: '#ffebee' },
  xiaohongshu: { label: '小红书',      color: '#ff2442', bg: '#fce4ec' },
  douyin:      { label: 'TikTok',      color: '#010101', bg: '#f5f5f5' },
  bilibili:    { label: 'Bilibili',    color: '#00a1d6', bg: '#e3f5fb' },
  twitter:     { label: 'Twitter/X',   color: '#1da1f2', bg: '#e8f5fd' },
  pinterest:   { label: 'Pinterest',   color: '#e60023', bg: '#fce4e4' },
  tripadvisor: { label: 'TripAdvisor', color: '#34e0a1', bg: '#e6faf4' },
  booking:     { label: 'Booking.com', color: '#003580', bg: '#e6edf8' },
  airbnb:      { label: 'Airbnb',      color: '#ff5a5f', bg: '#fff0f0' },
};

// ─── State ───────────────────────────────────────────────────────────────────

let currentTab     = null;
let selectedBoard  = null;   // null = Inbox, string = boardId
let travelPanelUrl = '';
let boards         = [];

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Wire settings links
  const settingsLink = document.getElementById('settings-link');
  const settingsLinkInline = document.getElementById('settings-link-inline');
  settingsLink.addEventListener('click', () => chrome.runtime.openOptionsPage());
  settingsLinkInline?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Load TravelPanel URL from storage
  const stored = await chrome.storage.sync.get(['travelPanelUrl', 'boards']);
  travelPanelUrl = stored.travelPanelUrl || '';
  boards = stored.boards || [];

  if (!travelPanelUrl) {
    document.getElementById('setup-notice').style.display = 'flex';
    renderBoards([]);
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  renderPagePreview(tab);
  await loadBoards();
}

// ─── Page preview ─────────────────────────────────────────────────────────────

function renderPagePreview(tab) {
  document.getElementById('page-title').textContent = tab.title || 'Untitled page';
  document.getElementById('page-url').textContent   = new URL(tab.url).hostname;

  // Favicon
  if (tab.favIconUrl) {
    const img = document.getElementById('favicon-img');
    img.src = tab.favIconUrl;
    img.style.display = 'block';
    document.getElementById('favicon-placeholder').style.display = 'none';
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  if (platform && PLATFORM_META[platform]) {
    const badge = document.getElementById('platform-badge');
    const meta  = PLATFORM_META[platform];
    badge.textContent        = meta.label;
    badge.style.display      = 'inline';
    badge.style.color        = meta.color;
    badge.style.background   = meta.bg;
  }
}

function detectPlatform(url) {
  if (!url) return null;
  for (const [key, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) return key;
  }
  return null;
}

// ─── Boards ───────────────────────────────────────────────────────────────────

async function loadBoards() {
  try {
    const res   = await fetch(`${travelPanelUrl}/api/boards`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      boards = data.boards || [];
      await chrome.storage.sync.set({ boards });
    }
  } catch {
    // Use cached boards from storage if API is unreachable
  }
  renderBoards(boards);
}

function renderBoards(boardList) {
  const container = document.getElementById('boards-list');
  container.innerHTML = '';

  // Inbox option
  const inboxBtn = document.createElement('button');
  inboxBtn.className = 'inbox-option' + (selectedBoard === null ? ' selected' : '');
  inboxBtn.innerHTML = `
    <span class="board-emoji">📥</span>
    <span class="board-name">Inbox</span>
    <span class="board-count">Unsorted</span>
  `;
  inboxBtn.addEventListener('click', () => selectBoard(null, inboxBtn));
  container.appendChild(inboxBtn);

  if (boardList.length === 0 && !travelPanelUrl) {
    // No boards and no URL configured — nothing else to show
    enableClipButton();
    return;
  }

  if (boardList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'no-boards';
    empty.innerHTML = `No boards yet.<br>Create one in TravelPanel first.`;
    container.appendChild(empty);
    enableClipButton();
    return;
  }

  boardList.slice(0, 5).forEach(board => {
    const btn = document.createElement('button');
    btn.className = 'board-option';
    btn.innerHTML = `
      <span class="board-emoji">${board.emoji || '🗺'}</span>
      <span class="board-name">${escapeHtml(board.name)}</span>
      <span class="board-count">${board.itemIds?.length ?? 0} clips</span>
    `;
    btn.addEventListener('click', () => selectBoard(board.id, btn));
    container.appendChild(btn);
  });

  enableClipButton();
}

function selectBoard(boardId, btnEl) {
  selectedBoard = boardId;
  // Update selection styles
  document.querySelectorAll('.board-option, .inbox-option').forEach(el => el.classList.remove('selected'));
  btnEl.classList.add('selected');
}

function enableClipButton() {
  const btn = document.getElementById('clip-btn');
  btn.disabled = false;
  btn.addEventListener('click', handleClip);
}

// ─── Clip action ──────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentTab?.url) return;

  const btn = document.getElementById('clip-btn');
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner" style="border-color:#fff3; border-top-color:#fff;"></span> Clipping…`;

  try {
    const shareUrl = buildShareUrl(currentTab.url, currentTab.title);

    // Open TravelPanel share page in a new tab
    await chrome.tabs.create({ url: shareUrl, active: true });

    // Show success state
    showSuccess(selectedBoard);
  } catch (err) {
    showError(err.message);
  }
}

function buildShareUrl(url, title) {
  if (!travelPanelUrl) throw new Error('TravelPanel URL not configured');
  const base   = travelPanelUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url, title: title || '' });
  if (selectedBoard) params.set('boardId', selectedBoard);
  return `${base}/share?${params.toString()}`;
}

// ─── Success / Error states ────────────────────────────────────────────────────

function showSuccess(boardId) {
  document.getElementById('main-content').style.display  = 'none';
  document.getElementById('success-state').style.display = 'block';

  const board = boards.find(b => b.id === boardId);
  const dest  = board ? `Saved to "${board.name}"` : 'Saved to Inbox';
  document.getElementById('success-sub').textContent = dest;

  const base = travelPanelUrl.replace(/\/$/, '');
  document.getElementById('open-app-link').href = boardId
    ? `${base}/boards/${boardId}`
    : `${base}/`;
}

function showError(msg) {
  const btn = document.getElementById('clip-btn');
  btn.disabled  = false;
  btn.innerHTML = `<span>📌</span> Clip to TravelPanel`;
  btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
  btn.title = msg;
  setTimeout(() => {
    btn.style.background = '';
    btn.title = '';
  }, 2000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}
