'use strict';

const urlInput     = document.getElementById('tp-url');
const boardsList   = document.getElementById('boards-list');
const newEmoji     = document.getElementById('new-emoji');
const newBoardName = document.getElementById('new-board-name');
const btnAdd       = document.getElementById('btn-add-board');
const btnSave      = document.getElementById('btn-save');
const saveStatus   = document.getElementById('save-status');

let boards = [];

// ─── Load ──────────────────────────────────────────────────────────────────────

async function load() {
  const stored = await chrome.storage.local.get(['tpUrl', 'boards']);
  urlInput.value = stored.tpUrl || '';
  boards = stored.boards || [];
  renderBoards();
}

// ─── Render boards ─────────────────────────────────────────────────────────────

function renderBoards() {
  boardsList.innerHTML = '';
  if (boards.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:#9ca3af;padding:4px 0;';
    empty.textContent = 'No custom boards yet — clips will go to Inbox.';
    boardsList.appendChild(empty);
    return;
  }
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const row = document.createElement('div');
    row.className = 'board-item';
    row.innerHTML = `
      <span class="board-emoji">${b.emoji || '📋'}</span>
      <span class="board-name">${escapeHtml(b.name)}</span>
      <button class="btn-remove" data-idx="${i}" title="Remove">×</button>
    `;
    boardsList.appendChild(row);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

boardsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-idx]');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  boards.splice(idx, 1);
  renderBoards();
});

// ─── Add board ─────────────────────────────────────────────────────────────────

btnAdd.addEventListener('click', addBoard);
newBoardName.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBoard(); });

function addBoard() {
  const name  = newBoardName.value.trim();
  const emoji = newEmoji.value.trim() || '📋';
  if (!name) { newBoardName.focus(); return; }
  boards.push({ id: `ext-${Date.now()}`, name, emoji });
  renderBoards();
  newBoardName.value = '';
  newEmoji.value = '🗺️';
}

// ─── Save ──────────────────────────────────────────────────────────────────────

btnSave.addEventListener('click', async () => {
  const url = urlInput.value.trim().replace(/\/$/, '');
  if (url && !isValidUrl(url)) {
    urlInput.focus();
    urlInput.style.borderColor = '#ef4444';
    setTimeout(() => { urlInput.style.borderColor = ''; }, 2000);
    return;
  }
  await chrome.storage.local.set({ tpUrl: url, boards });
  saveStatus.classList.add('visible');
  setTimeout(() => saveStatus.classList.remove('visible'), 2500);
});

function isValidUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

load().catch(console.error);
