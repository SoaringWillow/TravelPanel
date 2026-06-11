// ── Platform detection ────────────────────────────────────────────────────
const PLATFORM_PATTERNS = [
  { id: 'instagram',   re: /instagram\.com/i,            label: 'Instagram' },
  { id: 'youtube',     re: /youtube\.com|youtu\.be/i,    label: 'YouTube' },
  { id: 'xiaohongshu', re: /xiaohongshu\.com|xhslink\.com|rednote\.com/i, label: '小红书' },
  { id: 'douyin',      re: /douyin\.com|iesdouyin\.com/i, label: 'Douyin' },
  { id: 'bilibili',    re: /bilibili\.com|b23\.tv/i,     label: 'Bilibili' },
  { id: 'tiktok',      re: /tiktok\.com/i,               label: 'TikTok' },
  { id: 'twitter',     re: /twitter\.com|x\.com/i,       label: 'Twitter/X' },
  { id: 'reddit',      re: /reddit\.com/i,               label: 'Reddit' },
  { id: 'pinterest',   re: /pinterest\.com/i,            label: 'Pinterest' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.re.test(url)) return p;
  }
  return { id: 'web', label: 'Web' };
}

// ── State ─────────────────────────────────────────────────────────────────
let currentUrl = '';
let currentTitle = '';
let selectedBoardId = null;
let selectedBoardName = 'Inbox';
let appUrl = 'https://travelpanel.vercel.app';

// ── DOM refs ──────────────────────────────────────────────────────────────
const platformBadge   = document.getElementById('platform-badge');
const pageTitleEl     = document.getElementById('page-title');
const pageUrlEl       = document.getElementById('page-url');
const boardsRow       = document.getElementById('boards-row');
const boardsLoading   = document.getElementById('boards-loading');
const inboxChip       = document.querySelector('.board-chip--inbox');
const newBoardBtn     = document.getElementById('new-board-btn');
const newBoardSection = document.getElementById('new-board-section');
const newBoardInput   = document.getElementById('new-board-input');
const newBoardConfirm = document.getElementById('new-board-confirm');
const newBoardCancel  = document.getElementById('new-board-cancel');
const saveBtn         = document.getElementById('save-btn');
const successState    = document.getElementById('success-state');
const successBoardName = document.getElementById('success-board-name');
const errorState      = document.getElementById('error-state');
const errorMessage    = document.getElementById('error-message');
const settingsBtn     = document.getElementById('settings-btn');
const openAppLink     = document.getElementById('open-app-link');

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  // Load saved app URL
  const stored = await chrome.storage.local.get(['appUrl']);
  if (stored.appUrl) appUrl = stored.appUrl;
  openAppLink.href = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    showError('Cannot clip this page (browser internal page).');
    return;
  }

  currentUrl   = tab.url;
  currentTitle = tab.title || new URL(tab.url).hostname;

  // Show platform + page info
  const platform = detectPlatform(currentUrl);
  platformBadge.textContent = platform.label;
  platformBadge.dataset.platform = platform.id;
  pageTitleEl.textContent = currentTitle;
  pageUrlEl.textContent   = currentUrl;

  saveBtn.disabled = false;

  // Load boards from storage (synced from TravelPanel app via postMessage)
  loadBoards();
}

async function loadBoards() {
  boardsLoading.textContent = '';

  try {
    const stored = await chrome.storage.local.get(['cachedBoards']);
    const boards = stored.cachedBoards || [];

    boards.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6).forEach((board) => {
      const chip = createBoardChip(board.id, `${board.emoji || '🗺'} ${board.name}`);
      boardsRow.insertBefore(chip, newBoardBtn);
    });
  } catch {
    // No cached boards is fine — user can still save to Inbox
  }
}

function createBoardChip(boardId, label) {
  const btn = document.createElement('button');
  btn.className = 'board-chip board-chip--board';
  btn.textContent = label;
  btn.dataset.boardId = boardId;
  btn.dataset.boardName = label;
  btn.addEventListener('click', () => selectBoard(boardId, label, btn));
  return btn;
}

function selectBoard(boardId, boardName, chipEl) {
  // Deselect all
  document.querySelectorAll('.board-chip--selected').forEach((el) => {
    el.classList.remove('board-chip--selected');
  });

  chipEl.classList.add('board-chip--selected');
  selectedBoardId   = boardId === '__inbox__' ? null : boardId;
  selectedBoardName = boardName;
}

// ── New board flow ────────────────────────────────────────────────────────
newBoardBtn.addEventListener('click', () => {
  newBoardSection.hidden = false;
  newBoardBtn.hidden = true;
  newBoardInput.focus();
});

newBoardCancel.addEventListener('click', () => {
  newBoardSection.hidden = true;
  newBoardBtn.hidden = false;
  newBoardInput.value = '';
});

newBoardConfirm.addEventListener('click', confirmNewBoard);
newBoardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmNewBoard();
  if (e.key === 'Escape') newBoardCancel.click();
});

function confirmNewBoard() {
  const name = newBoardInput.value.trim();
  if (!name) return;

  // Store the new board in pending state — TravelPanel will pick it up
  const newBoard = {
    id: crypto.randomUUID(),
    name,
    emoji: '🗺',
    itemIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pendingCreate: true,
  };

  chrome.storage.local.get(['cachedBoards'], ({ cachedBoards = [] }) => {
    chrome.storage.local.set({ cachedBoards: [newBoard, ...cachedBoards] });
  });

  // Add chip and select it
  const chip = createBoardChip(newBoard.id, `${newBoard.emoji} ${newBoard.name}`);
  boardsRow.insertBefore(chip, newBoardBtn);
  selectBoard(newBoard.id, `${newBoard.emoji} ${newBoard.name}`, chip);

  newBoardSection.hidden = true;
  newBoardBtn.hidden = false;
  newBoardInput.value = '';
}

// ── Inbox chip ────────────────────────────────────────────────────────────
inboxChip.addEventListener('click', () => selectBoard('__inbox__', 'Inbox', inboxChip));

// ── Save action ───────────────────────────────────────────────────────────
saveBtn.addEventListener('click', handleSave);

async function handleSave() {
  if (!currentUrl) return;

  saveBtn.disabled = true;

  // Build the share URL — reuse TravelPanel's existing /share page
  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', currentUrl);
  shareUrl.searchParams.set('title', currentTitle);
  if (selectedBoardId) shareUrl.searchParams.set('boardId', selectedBoardId);

  // Open share page in a new tab
  await chrome.tabs.create({ url: shareUrl.toString(), active: true });

  // Show success state
  saveBtn.closest('.btn--save') && (saveBtn.style.display = 'none');
  document.querySelector('.section-label').hidden = true;
  boardsRow.hidden = true;
  newBoardBtn.hidden = true;
  newBoardSection.hidden = true;
  document.querySelector('.divider').hidden = true;
  saveBtn.hidden = true;

  successState.hidden = false;
  successBoardName.textContent = `Saved to ${selectedBoardName}`;

  // Auto-close popup after 1.5s
  setTimeout(() => window.close(), 1500);
}

// ── Settings ──────────────────────────────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Error display ─────────────────────────────────────────────────────────
function showError(msg) {
  saveBtn.disabled = true;
  errorMessage.textContent = msg;
  errorState.hidden = false;
}

// ── Run ───────────────────────────────────────────────────────────────────
init().catch((err) => showError(`Error: ${err.message}`));
