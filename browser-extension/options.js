// TravelPanel Clipper — Options Page Logic

async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || { apiUrl: '', rateLimitCount: 0, rateLimitReset: 0 };
}

async function getBoards() {
  const result = await chrome.storage.local.get('boards');
  return result.boards || {};
}

async function getItems() {
  const result = await chrome.storage.local.get('items');
  return result.items || {};
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();

  // Populate API URL field
  document.getElementById('api-url').value = settings.apiUrl || '';

  // Load boards
  await renderBoards();

  // Render usage stats
  await renderUsageStats(settings);

  // Save button
  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('api-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSave();
  });

  // Add board
  document.getElementById('add-board-btn').addEventListener('click', handleAddBoard);
  document.getElementById('new-board-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddBoard();
  });

  // Clear data
  document.getElementById('clear-data-btn').addEventListener('click', handleClearData);
});

// ─── Save settings ────────────────────────────────────────────────────────────

async function handleSave() {
  const apiUrl = document.getElementById('api-url').value.trim().replace(/\/$/, '');

  if (apiUrl && !apiUrl.startsWith('http')) {
    showSaveStatus('URL must start with http:// or https://', true);
    return;
  }

  const settings = await getSettings();
  await chrome.storage.local.set({
    settings: { ...settings, apiUrl },
  });

  showSaveStatus('Settings saved!');
}

function showSaveStatus(msg, isError = false) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.style.color = isError ? '#b91c1c' : '#059669';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ─── Boards ───────────────────────────────────────────────────────────────────

async function renderBoards() {
  const boards = await getBoards();
  const list = document.getElementById('boards-list');
  list.innerHTML = '';

  const sorted = Object.values(boards).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (sorted.length === 0) {
    list.innerHTML = '<div style="font-size: 12px; color: #9ca3af; padding: 4px 0;">No boards yet. Add one below.</div>';
    return;
  }

  sorted.forEach(board => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; padding: 7px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;';

    const emoji = document.createElement('span');
    emoji.textContent = board.emoji || '📌';
    emoji.style.fontSize = '16px';

    const name = document.createElement('span');
    name.textContent = board.name;
    name.style.cssText = 'flex: 1; font-size: 13px; color: #111827; font-weight: 500;';

    const del = document.createElement('button');
    del.textContent = '✕';
    del.style.cssText = 'background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 4px;';
    del.title = 'Delete board';
    del.addEventListener('click', async () => {
      if (confirm(`Delete board "${board.name}"? Clips in this board will move to Inbox.`)) {
        await deleteBoard(board.id);
        await renderBoards();
      }
    });
    del.addEventListener('mouseenter', () => { del.style.color = '#b91c1c'; });
    del.addEventListener('mouseleave', () => { del.style.color = '#9ca3af'; });

    row.appendChild(emoji);
    row.appendChild(name);
    row.appendChild(del);
    list.appendChild(row);
  });
}

async function handleAddBoard() {
  const nameInput = document.getElementById('new-board-name');
  const emojiInput = document.getElementById('new-board-emoji');

  const name = nameInput.value.trim();
  const emoji = emojiInput.value.trim() || '📌';

  if (!name) {
    nameInput.focus();
    return;
  }

  const boards = await getBoards();
  const id = crypto.randomUUID();
  boards[id] = {
    id,
    name,
    emoji,
    itemIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await chrome.storage.local.set({ boards });

  nameInput.value = '';
  emojiInput.value = '';
  await renderBoards();
}

async function deleteBoard(boardId) {
  const result = await chrome.storage.local.get(['boards', 'items']);
  const boards = result.boards || {};
  const items = result.items || {};

  // Move items to inbox
  Object.values(items).forEach(item => {
    if (item.boardId === boardId) {
      item.boardId = null;
    }
  });

  delete boards[boardId];
  await chrome.storage.local.set({ boards, items });
}

// ─── Usage stats ──────────────────────────────────────────────────────────────

async function renderUsageStats(settings) {
  const items = await getItems();
  const totalClips = Object.keys(items).length;
  const doneClips = Object.values(items).filter(i => i.enrichmentStatus === 'done').length;
  const failedClips = Object.values(items).filter(i => i.enrichmentStatus === 'failed').length;
  const pendingClips = Object.values(items).filter(i => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'processing').length;

  const now = Date.now();
  const used = settings.rateLimitCount || 0;
  const isReset = !settings.rateLimitReset || now >= settings.rateLimitReset;
  const remaining = isReset ? 30 : Math.max(0, 30 - used);

  const resetTime = settings.rateLimitReset
    ? new Date(settings.rateLimitReset).toLocaleTimeString()
    : 'midnight UTC';

  document.getElementById('usage-stats').innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
      <div style="padding: 8px 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="font-size: 20px; font-weight: 700; color: #111827;">${totalClips}</div>
        <div style="font-size: 11px; color: #6b7280;">Total clips</div>
      </div>
      <div style="padding: 8px 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="font-size: 20px; font-weight: 700; color: ${remaining < 5 ? '#b91c1c' : '#059669'};">${remaining}</div>
        <div style="font-size: 11px; color: #6b7280;">Clips left today</div>
      </div>
    </div>
    ${failedClips > 0 ? `<div style="font-size: 12px; color: #b91c1c; margin-top: 4px;">⚠️ ${failedClips} clip${failedClips !== 1 ? 's' : ''} failed to extract — will retry automatically.</div>` : ''}
    ${pendingClips > 0 ? `<div style="font-size: 12px; color: #92400e; margin-top: 4px;">⏳ ${pendingClips} clip${pendingClips !== 1 ? 's' : ''} processing...</div>` : ''}
    ${!isReset ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Resets at ${resetTime}</div>` : ''}
  `;
}

// ─── Clear data ───────────────────────────────────────────────────────────────

async function handleClearData() {
  const items = await getItems();
  const count = Object.keys(items).length;

  if (count === 0) {
    showSaveStatus('No clips to clear.');
    return;
  }

  const confirmed = confirm(
    `Delete all ${count} saved clips from the extension? This cannot be undone.\n\nNote: clips already synced to TravelPanel will remain in the app.`
  );

  if (!confirmed) return;

  await chrome.storage.local.set({ items: {} });
  await chrome.action.setBadgeText({ text: '' });
  await renderUsageStats(await getSettings());
  showSaveStatus(`Cleared ${count} clips.`);
}
