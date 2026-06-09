// TravelPanel Browser Extension — Popup logic

const PLATFORM_COLORS = {
  xiaohongshu: '#FF2442',
  wechat: '#07C160',
  douyin: '#010101',
  bilibili: '#00A1D6',
  youtube: '#FF0000',
  instagram: '#E1306C',
  other: '#6B7280',
};

const PLATFORM_LABELS = {
  xiaohongshu: '小红书',
  wechat: 'WeChat',
  douyin: 'Douyin',
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  instagram: 'Instagram',
  other: 'Web',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

// ── State helpers ─────────────────────────────────────────────────────────────

function showState(id) {
  ['state-no-config', 'state-no-url', 'state-main', 'state-success'].forEach(s => {
    document.getElementById(s).style.display = s === id ? '' : 'none';
  });
}

// ── Boards ────────────────────────────────────────────────────────────────────

let selectedBoardId = '';
let selectedBoardName = 'Inbox';
let localBoards = [];
let showingNewBoardForm = false;

function renderBoards(boards) {
  const container = document.getElementById('board-chips');
  container.innerHTML = '';

  // Inbox chip
  const inbox = makeChip('', 'Inbox', 'chip-inbox');
  container.appendChild(inbox);

  // Recent boards (up to 5, most-recently-updated first)
  const recent = [...boards]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);

  recent.forEach(board => {
    const chip = makeChip(board.id, `${board.emoji || '🗺'} ${board.name}`, 'chip-board');
    container.appendChild(chip);
  });

  // + New chip
  const newChip = document.createElement('button');
  newChip.className = 'chip chip-new';
  newChip.textContent = '+ New';
  newChip.addEventListener('click', toggleNewBoardForm);
  container.appendChild(newChip);

  // Re-highlight selection
  highlightSelected();
}

function makeChip(id, label, cls) {
  const btn = document.createElement('button');
  btn.className = `chip ${cls}`;
  btn.dataset.boardId = id;
  btn.dataset.boardName = label;
  btn.textContent = label;
  btn.addEventListener('click', () => selectBoard(id, label));
  return btn;
}

function selectBoard(id, name) {
  selectedBoardId = id;
  selectedBoardName = name;
  highlightSelected();
  const clipBtn = document.getElementById('btn-clip');
  clipBtn.disabled = false;
}

function highlightSelected() {
  document.querySelectorAll('#board-chips .chip').forEach(chip => {
    const isSelected = chip.dataset.boardId === selectedBoardId &&
      chip.dataset.boardName === selectedBoardName;
    if (isSelected) {
      chip.style.outline = '2.5px solid #4F46E5';
      chip.style.outlineOffset = '1px';
    } else {
      chip.style.outline = '';
      chip.style.outlineOffset = '';
    }
  });
}

function toggleNewBoardForm() {
  showingNewBoardForm = !showingNewBoardForm;
  const form = document.getElementById('new-board-form');
  form.classList.toggle('visible', showingNewBoardForm);
  if (showingNewBoardForm) {
    document.getElementById('new-board-input').focus();
  }
}

document.getElementById('btn-create-board').addEventListener('click', createNewBoard);
document.getElementById('new-board-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') createNewBoard();
});
document.getElementById('new-board-input').addEventListener('input', () => {
  const val = document.getElementById('new-board-input').value.trim();
  document.getElementById('btn-create-board').disabled = !val;
});

function createNewBoard() {
  const name = document.getElementById('new-board-input').value.trim();
  if (!name) return;
  const newBoard = {
    id: crypto.randomUUID(),
    name,
    emoji: '🗺',
    itemIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  localBoards = [newBoard, ...localBoards];
  renderBoards(localBoards);
  selectBoard(newBoard.id, `${newBoard.emoji} ${newBoard.name}`);
  document.getElementById('new-board-input').value = '';
  showingNewBoardForm = false;
  document.getElementById('new-board-form').classList.remove('visible');

  // Persist new board to extension storage for next session
  chrome.storage.local.set({ pendingNewBoard: newBoard });
}

// ── Clip action ───────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';
let appUrl = '';

document.getElementById('btn-clip').addEventListener('click', doClip);

async function doClip() {
  if (!currentUrl || !appUrl) return;

  const btn = document.getElementById('btn-clip');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Clipping…';

  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', currentUrl);
  shareUrl.searchParams.set('title', currentTitle || '');
  if (selectedBoardId) shareUrl.searchParams.set('boardId', selectedBoardId);

  // Open TravelPanel share page in a new tab
  await chrome.tabs.create({ url: shareUrl.toString() });

  showState('state-success');
  document.getElementById('success-title').textContent =
    `Saved to ${selectedBoardName}!`;
  document.getElementById('success-sub').textContent =
    'TravelPanel is extracting locations & tips…';
}

document.getElementById('btn-clip-another').addEventListener('click', () => {
  showState('state-main');
  const btn = document.getElementById('btn-clip');
  btn.disabled = false;
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
    Clip to TravelPanel`;
});

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('btn-open-options')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Load stored config
  const stored = await chrome.storage.local.get(['appUrl', 'boards']);
  appUrl = stored.appUrl || '';
  localBoards = stored.boards || [];

  if (!appUrl) {
    showState('state-no-config');
    return;
  }

  // 2. Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url || '';
  currentTitle = tab?.title || '';

  if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('about:')) {
    showState('state-no-url');
    return;
  }

  // 3. Show main state
  showState('state-main');

  // 4. Render page preview
  const platform = detectPlatform(currentUrl);
  const badge = document.getElementById('platform-badge');
  badge.textContent = PLATFORM_LABELS[platform];
  badge.style.background = PLATFORM_COLORS[platform];

  document.getElementById('page-title').textContent = currentTitle || currentUrl;
  document.getElementById('page-url-text').textContent = currentUrl;

  // 5. Render board chips
  renderBoards(localBoards);

  // Pre-select Inbox by default
  selectBoard('', 'Inbox');

  // 6. Reload boards from app in background (non-blocking)
  refreshBoardsFromApp(appUrl);
}

async function refreshBoardsFromApp(base) {
  try {
    const res = await fetch(`${base}/api/boards`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.boards)) {
      localBoards = data.boards;
      await chrome.storage.local.set({ boards: localBoards });
      renderBoards(localBoards);
    }
  } catch {
    // offline or no API — use cached boards
  }
}

init();
