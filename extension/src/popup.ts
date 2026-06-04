import {
  getSettings,
  saveSettings,
  getBoards,
  saveBoard,
  saveClip,
  addClipToBoard,
  detectPlatform,
  generateId,
} from './storage';
import type { Board, SavedClip } from './types';

interface PageInfo {
  url: string;
  title: string;
  favIconUrl?: string;
}

type ScreenId = 'loading' | 'setup' | 'main' | 'saving' | 'success' | 'error';

let currentPageInfo: PageInfo | null = null;
let selectedBoardId: string | undefined = undefined;
let apiBaseUrl = '';

function showScreen(id: ScreenId) {
  document.querySelectorAll<HTMLElement>('.screen').forEach(el => {
    el.classList.toggle('hidden', el.id !== id);
  });
}

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

async function init() {
  showScreen('loading');

  const settings = await getSettings();
  if (!settings?.apiBaseUrl) {
    showScreen('setup');
    initSetupScreen();
    return;
  }

  apiBaseUrl = settings.apiBaseUrl;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showError('Could not get the current page URL.');
    return;
  }

  currentPageInfo = {
    url: tab.url,
    title: tab.title || tab.url,
    favIconUrl: tab.favIconUrl,
  };

  initMainScreen();
}

function initSetupScreen() {
  const input = el<HTMLInputElement>('api-url-input');
  const btn = el('save-settings-btn');

  btn.addEventListener('click', async () => {
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) return;
    await saveSettings({ apiBaseUrl: url });
    apiBaseUrl = url;
    initMainScreen();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

async function initMainScreen() {
  if (!currentPageInfo) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentPageInfo = {
      url: tab?.url || '',
      title: tab?.title || '',
      favIconUrl: tab?.favIconUrl,
    };
  }

  showScreen('main');

  const favicon = el<HTMLImageElement>('page-favicon');
  const titleEl = el('page-title');
  const urlEl = el('page-url');

  if (currentPageInfo.favIconUrl) {
    favicon.src = currentPageInfo.favIconUrl;
    favicon.onerror = () => { favicon.style.display = 'none'; };
  } else {
    favicon.style.display = 'none';
  }

  titleEl.textContent = currentPageInfo.title || currentPageInfo.url;

  try {
    const u = new URL(currentPageInfo.url);
    const path = u.pathname.length > 1 ? u.pathname.slice(0, 28) + (u.pathname.length > 28 ? '…' : '') : '';
    urlEl.textContent = u.hostname + path;
  } catch {
    urlEl.textContent = currentPageInfo.url.slice(0, 40);
  }

  const openLink = el<HTMLAnchorElement>('open-app-link');
  openLink.href = `${apiBaseUrl}/share?url=${encodeURIComponent(currentPageInfo.url)}&title=${encodeURIComponent(currentPageInfo.title || '')}`;

  await renderBoards();

  el('new-board-btn').addEventListener('click', () => {
    const form = el('new-board-form');
    const isHidden = form.classList.contains('hidden');
    form.classList.toggle('hidden', !isHidden);
    if (isHidden) el<HTMLInputElement>('new-board-name').focus();
  });

  el('create-board-btn').addEventListener('click', createBoard);
  el<HTMLInputElement>('new-board-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el('create-board-btn').click();
  });

  el('clip-btn').addEventListener('click', handleClip);
  el('settings-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

async function renderBoards(selectId?: string) {
  const boards = await getBoards();
  const list = el('board-list');
  list.innerHTML = '';

  const inbox = makeBoardItem(undefined, '📥', 'Inbox');
  list.appendChild(inbox);

  boards.forEach(b => list.appendChild(makeBoardItem(b.id, b.emoji, b.name)));

  const target = selectId ?? selectedBoardId;
  if (target) {
    selectBoard(target);
  } else {
    inbox.classList.add('selected');
    selectedBoardId = undefined;
  }
}

function makeBoardItem(id: string | undefined, emoji: string, name: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'board-item';
  item.dataset.boardId = id ?? '';
  item.innerHTML = `<span class="board-emoji">${emoji}</span><span class="board-name">${escapeHtml(name)}</span>`;
  item.addEventListener('click', () => selectBoard(id));
  return item;
}

function selectBoard(id: string | undefined) {
  selectedBoardId = id;
  document.querySelectorAll<HTMLElement>('.board-item').forEach(item => {
    item.classList.toggle('selected', (item.dataset.boardId || undefined) === (id ?? ''));
  });
}

async function createBoard() {
  const input = el<HTMLInputElement>('new-board-name');
  const name = input.value.trim();
  if (!name) return;

  const board: Board = {
    id: generateId(),
    name,
    emoji: pickEmoji(name),
    clipIds: [],
    createdAt: Date.now(),
  };

  await saveBoard(board);
  input.value = '';
  el('new-board-form').classList.add('hidden');
  await renderBoards(board.id);
}

function pickEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (/japan|tokyo|kyoto|osaka/.test(lower)) return '🗼';
  if (/paris|france|europe/.test(lower)) return '🗼';
  if (/beach|island|bali|hawaii/.test(lower)) return '🏖️';
  if (/mountain|hiking|trek/.test(lower)) return '🏔️';
  if (/food|eat|cafe|restaurant/.test(lower)) return '🍜';
  if (/city|urban|metro/.test(lower)) return '🌆';
  return '📍';
}

async function handleClip() {
  if (!currentPageInfo?.url) return;

  showScreen('saving');

  const clipId = generateId();
  const clip: SavedClip = {
    id: clipId,
    url: currentPageInfo.url,
    platform: detectPlatform(currentPageInfo.url),
    title: currentPageInfo.title || currentPageInfo.url,
    description: '',
    locations: [],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    enrichmentStatus: 'pending',
    retryCount: 0,
    boardId: selectedBoardId,
  };

  await saveClip(clip);
  if (selectedBoardId) await addClipToBoard(selectedBoardId, clipId);

  try {
    const res = await fetch(`${apiBaseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentPageInfo.url }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();

    await saveClip({
      ...clip,
      title: data.title || clip.title,
      description: data.description || '',
      thumbnail: data.thumbnail,
      platform: data.platform || clip.platform,
      locations: data.locations ?? [],
      activities: data.activities ?? [],
      tags: data.tags ?? [],
      substance: data.substance ?? [],
      enrichmentStatus: 'done',
    });

    const boards = await getBoards();
    const boardName = selectedBoardId
      ? (boards.find(b => b.id === selectedBoardId)?.name ?? 'board')
      : 'Inbox';

    el('success-detail').textContent = `Saved to ${boardName}`;

    const locs = (data.locations ?? []).length;
    const subs = (data.substance ?? []).length;

    if (locs > 0 || subs > 0) {
      el('success-stats').classList.remove('hidden');
      el('location-count').textContent = `📍 ${locs} ${locs === 1 ? 'spot' : 'spots'}`;
      el('substance-count').textContent = `💡 ${subs} ${subs === 1 ? 'tip' : 'tips'}`;
    }

    showScreen('success');
    setTimeout(() => window.close(), 2500);

  } catch (err) {
    // Clip is already saved as 'pending' — it will enrich when app retries
    el('error-message').textContent =
      err instanceof Error && err.name !== 'TimeoutError'
        ? `Could not reach TravelPanel: ${err.message}`
        : 'Request timed out. The clip was saved and will retry when the app opens.';

    showScreen('error');

    el('retry-btn').addEventListener('click', () => handleClip(), { once: true });
    el('save-anyway-btn').addEventListener('click', () => {
      el('success-detail').textContent = 'Saved — will extract info when TravelPanel opens';
      el('success-stats').classList.add('hidden');
      showScreen('success');
      setTimeout(() => window.close(), 2000);
    }, { once: true });
  }
}

function showError(msg: string) {
  el('error-message').textContent = msg;
  showScreen('error');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
