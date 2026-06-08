const DB_NAME = 'travel-panel';
const DEFAULT_URL = 'http://localhost:3000';

let appUrl = DEFAULT_URL;
let selectedBoardId = 'inbox';
let currentTab = null;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const settings = await chrome.storage.sync.get(['appUrl']);
  appUrl = (settings.appUrl || DEFAULT_URL).replace(/\/$/, '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.url || /^(chrome|about|edge|brave):/.test(tab.url)) {
    showNcState('Cannot clip browser internal pages.');
    return;
  }

  renderPageInfo(tab);

  // Board loading (async, non-blocking)
  loadBoards().catch(() => showNoBoardsHint());

  // Events
  document.getElementById('clip-btn').addEventListener('click', handleClip);
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  document.getElementById('open-tp-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
  document.getElementById('open-tp-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
  document.getElementById('nc-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// ── Page info ────────────────────────────────────────────────────────────────

function renderPageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const urlEl   = document.getElementById('page-url');
  const favEl   = document.getElementById('page-favicon');

  titleEl.textContent = tab.title?.trim() || 'Untitled page';

  try {
    const u = new URL(tab.url);
    urlEl.textContent = u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    urlEl.textContent = tab.url.slice(0, 50);
  }

  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.onerror = () => { img.remove(); };
    favEl.replaceChildren(img);
  }
}

// ── Board loading ─────────────────────────────────────────────────────────────

async function loadBoards() {
  const loadingRow = document.getElementById('loading-row');

  try {
    // Look for an open TravelPanel tab
    const tabs = await chrome.tabs.query({});
    const tpTab = tabs.find(t => t.url?.startsWith(appUrl) && !t.url.includes('/share'));

    if (tpTab) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tpTab.id },
        world: 'MAIN',
        func: (dbName) => {
          return new Promise((resolve) => {
            try {
              const req = indexedDB.open(dbName, 2);
              req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('boards')) { resolve([]); return; }
                const tx  = db.transaction('boards', 'readonly');
                const all = tx.objectStore('boards').getAll();
                all.onsuccess = () => resolve(all.result || []);
                all.onerror  = () => resolve([]);
              };
              req.onerror = () => resolve([]);
            } catch { resolve([]); }
          });
        },
        args: [DB_NAME],
      });

      const boards = (results[0]?.result || [])
        .filter(b => !b.isDemo)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      await chrome.storage.local.set({ cachedBoards: boards, boardsCachedAt: Date.now() });
      renderBoardChips(boards);
      loadingRow.classList.add('hidden');
      return;
    }
  } catch (_) { /* fall through */ }

  // Fallback: cached boards
  const cache = await chrome.storage.local.get(['cachedBoards', 'boardsCachedAt']);
  if (cache.cachedBoards?.length) {
    const ageMin = (Date.now() - (cache.boardsCachedAt || 0)) / 60000;
    renderBoardChips(cache.cachedBoards);
    loadingRow.classList.add('hidden');
    if (ageMin > 60) showNoBoardsHint(true); // stale hint
    return;
  }

  loadingRow.classList.add('hidden');
  showNoBoardsHint();
}

function renderBoardChips(boards) {
  const row = document.getElementById('board-row');

  // Keep Inbox chip, append others
  const existing = row.querySelector('[data-board="inbox"]');
  row.replaceChildren(existing);

  for (const board of boards.slice(0, 6)) {
    const btn = document.createElement('button');
    btn.className = 'board-chip';
    btn.dataset.board = board.id;
    btn.innerHTML = `<span class="chip-icon">${escHtml(board.emoji || '📁')}</span><span class="chip-name">${escHtml(board.name)}</span>`;
    row.appendChild(btn);
  }

  attachChipHandlers();
}

function attachChipHandlers() {
  document.querySelectorAll('.board-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBoardId = btn.dataset.board;
      document.querySelectorAll('.board-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function showNoBoardsHint(stale = false) {
  const hint = document.getElementById('no-tp-hint');
  if (stale) {
    hint.innerHTML = 'Showing cached boards. <a href="#" id="open-tp-link">Open TravelPanel</a> to refresh.';
  }
  hint.classList.remove('hidden');
  document.getElementById('open-tp-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

// ── Clip ──────────────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentTab?.url) return;

  const btn = document.getElementById('clip-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Opening…';

  const notes = document.getElementById('notes-input').value.trim();
  const params = new URLSearchParams({ url: currentTab.url, title: currentTab.title || '', source: 'extension' });
  if (selectedBoardId !== 'inbox') params.set('board', selectedBoardId);
  if (notes) params.set('notes', notes);

  const shareUrl = `${appUrl}/share?${params}`;

  try {
    const w = 480, h = 580;
    await chrome.windows.create({
      url: shareUrl,
      type: 'popup',
      width: w,
      height: h,
      left: Math.round((screen.width  - w) / 2),
      top:  Math.round((screen.height - h) / 2),
    });
    showSuccess();
  } catch (err) {
    // Fallback: open in new tab
    chrome.tabs.create({ url: shareUrl });
    showSuccess();
  }
}

// ── States ────────────────────────────────────────────────────────────────────

function showSuccess() {
  document.getElementById('main-content').classList.add('hidden');
  const s = document.getElementById('success-state');
  s.classList.remove('hidden');
  const boardName = document.querySelector('.board-chip.active .chip-name')?.textContent || 'Inbox';
  document.getElementById('success-sub').textContent = `Saved to ${boardName} · closing…`;
  setTimeout(() => window.close(), 1600);
}

function showNcState(msg) {
  document.getElementById('main-content').classList.add('hidden');
  const nc = document.getElementById('nc-state');
  nc.classList.remove('hidden');
  if (msg) document.getElementById('nc-msg').textContent = msg;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Boot
document.addEventListener('DOMContentLoaded', init);
