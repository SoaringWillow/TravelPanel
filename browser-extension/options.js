// ─── DOM refs ──────────────────────────────────────────────────────────────

const appUrlInput   = document.getElementById('appUrl');
const boardsEditor  = document.getElementById('boardsEditor');
const addBoardBtn   = document.getElementById('addBoardBtn');
const saveBtn       = document.getElementById('saveBtn');
const toast         = document.getElementById('toast');

// ─── Default boards ────────────────────────────────────────────────────────

const DEFAULT_BOARDS = [
  { id: 'inbox',  name: 'Inbox', emoji: '📥' },
];

let boards = [...DEFAULT_BOARDS];

// ─── Load saved settings ───────────────────────────────────────────────────

async function load() {
  const stored = await chrome.storage.sync.get(['appBaseUrl', 'boards']);
  appUrlInput.value = stored.appBaseUrl ?? 'https://travel-panel.vercel.app';
  boards = stored.boards ?? DEFAULT_BOARDS;
  renderBoards();
}

// ─── Board editor ──────────────────────────────────────────────────────────

function renderBoards() {
  boardsEditor.innerHTML = '';
  boards.forEach((board, idx) => {
    const row = document.createElement('div');
    row.className = 'board-row';

    const emojiInput = document.createElement('input');
    emojiInput.className = 'board-emoji-input';
    emojiInput.value = board.emoji ?? '📌';
    emojiInput.maxLength = 2;
    emojiInput.title = 'Emoji';
    emojiInput.addEventListener('input', () => { boards[idx].emoji = emojiInput.value.trim() || '📌'; });

    const nameInput = document.createElement('input');
    nameInput.className = 'board-name-input';
    nameInput.type = 'text';
    nameInput.value = board.name;
    nameInput.placeholder = 'Board name';
    nameInput.addEventListener('input', () => { boards[idx].name = nameInput.value; });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    removeBtn.addEventListener('click', () => {
      boards.splice(idx, 1);
      renderBoards();
    });

    // Don't let the Inbox row be removed
    if (board.id === 'inbox' || board.id === '__inbox__') {
      removeBtn.style.visibility = 'hidden';
      emojiInput.readOnly = true;
      nameInput.readOnly = true;
    }

    row.appendChild(emojiInput);
    row.appendChild(nameInput);
    row.appendChild(removeBtn);
    boardsEditor.appendChild(row);
  });
}

addBoardBtn.addEventListener('click', () => {
  boards.push({ id: crypto.randomUUID(), name: '', emoji: '📌' });
  renderBoards();
  // Focus the new name input
  const rows = boardsEditor.querySelectorAll('.board-name-input');
  rows[rows.length - 1]?.focus();
});

// ─── Save ──────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  const appBaseUrl = appUrlInput.value.trim().replace(/\/$/, '');

  // Validate URL
  try {
    new URL(appBaseUrl);
  } catch {
    appUrlInput.focus();
    appUrlInput.style.borderColor = '#f43f5e';
    setTimeout(() => { appUrlInput.style.borderColor = ''; }, 1500);
    return;
  }

  const validBoards = boards.filter(b => b.name.trim());
  await chrome.storage.sync.set({ appBaseUrl, boards: validBoards });

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
});

// ─── Boot ──────────────────────────────────────────────────────────────────

load().catch(console.error);
