/* global chrome */

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_COLORS = {
  wechat:       '#07C160',
  xiaohongshu:  '#FF2442',
  douyin:       '#161823',
  bilibili:     '#00AEEC',
  other:        '#6366F1',
};

const PLATFORM_LABELS = {
  wechat:       'WeChat',
  xiaohongshu:  '小红书',
  douyin:       'Douyin',
  bilibili:     'Bilibili',
  other:        'Web',
};

// ─── State ───────────────────────────────────────────────────────────────────

let currentTab   = null;
let appUrl       = '';
let boards       = [];
let selectedId   = 'inbox'; // 'inbox' or a board id

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.local.get(['appUrl', 'boards']);
  appUrl  = stored.appUrl  || '';
  boards  = stored.boards  || [];

  if (!appUrl) {
    showState('setup-state');
    bindSetup();
    return;
  }

  showState('main-state');
  bindMain();
  await loadTab();
  renderBoards(boards);
  refreshBoardsFromApp();
}

// ─── Setup state ─────────────────────────────────────────────────────────────

function bindSetup() {
  document.getElementById('setup-save-btn').addEventListener('click', async () => {
    let url = document.getElementById('setup-url').value.trim().replace(/\/+$/, '');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await chrome.storage.local.set({ appUrl: url });
    appUrl = url;
    showState('main-state');
    bindMain();
    await loadTab();
    renderBoards([]);
    refreshBoardsFromApp();
  });

  document.getElementById('setup-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('setup-save-btn').click();
  });
}

// ─── Main state ───────────────────────────────────────────────────────────────

function bindMain() {
  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function loadTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  if (!tab) return;

  const url      = tab.url  || '';
  const title    = tab.title || url;
  const platform = detectPlatform(url);

  document.getElementById('page-title').textContent = truncate(title, 80);
  document.getElementById('page-url').textContent   = truncate(url,   60);

  // Favicon
  if (tab.favIconUrl) {
    const wrap = document.getElementById('favicon-wrap');
    const img  = document.createElement('img');
    img.src    = tab.favIconUrl;
    img.width  = 20;
    img.height = 20;
    img.onerror = () => { wrap.innerHTML = '🌐'; };
    wrap.innerHTML = '';
    wrap.appendChild(img);
  }

  // Platform badge
  if (platform !== 'other') {
    const badge = document.getElementById('platform-badge');
    badge.textContent       = PLATFORM_LABELS[platform];
    badge.style.background  = PLATFORM_COLORS[platform];
    badge.classList.remove('hidden');
  }
}

// ─── Board list ───────────────────────────────────────────────────────────────

function renderBoards(list) {
  const container = document.getElementById('board-list');
  container.innerHTML = '';

  // Inbox chip (always first)
  container.appendChild(makeChip('inbox', '📥', 'Inbox', selectedId === 'inbox'));

  // Up to 5 most-recent boards
  list.slice(0, 5).forEach((b) => {
    container.appendChild(makeChip(b.id, b.emoji || '📌', b.name, selectedId === b.id));
  });

  // "+ New board" chip
  const newChip = document.createElement('div');
  newChip.className = 'board-chip new-board';
  newChip.innerHTML = '<span>+</span><span>New board</span>';
  newChip.addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
  container.appendChild(newChip);
}

function makeChip(id, emoji, name, selected) {
  const chip = document.createElement('div');
  chip.className = 'board-chip' + (selected ? ' selected' : '');
  chip.dataset.id = id;
  chip.innerHTML  = `<span>${emoji}</span><span>${truncate(name, 18)}</span>`;
  chip.addEventListener('click', () => {
    selectedId = id;
    document.querySelectorAll('.board-chip').forEach((c) => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
  return chip;
}

async function refreshBoardsFromApp() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_BOARDS', appUrl });
    if (response?.boards?.length) {
      boards = response.boards;
      await chrome.storage.local.set({ boards });
      renderBoards(boards);
    }
  } catch (_) {
    // cached boards already rendered
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function handleSave() {
  if (!currentTab) return;

  const saveBtn = document.getElementById('save-btn');
  const label   = document.getElementById('save-label');
  const errorEl = document.getElementById('error-msg');

  saveBtn.disabled  = true;
  label.innerHTML   = '<span class="spinner"></span>Saving…';
  errorEl.classList.add('hidden');

  const clip = {
    id:               crypto.randomUUID(),
    url:              currentTab.url,
    title:            currentTab.title || currentTab.url,
    platform:         detectPlatform(currentTab.url),
    description:      '',
    thumbnail:        currentTab.favIconUrl || '',
    locations:        [],
    activities:       [],
    tags:             [],
    substance:        [],
    savedAt:          Date.now(),
    enrichmentStatus: 'pending',
    retryCount:       0,
    boardId:          selectedId === 'inbox' ? undefined : selectedId,
  };

  try {
    await chrome.runtime.sendMessage({ type: 'SAVE_CLIP', clip, appUrl });

    const boardName = selectedId === 'inbox'
      ? 'Inbox'
      : (boards.find((b) => b.id === selectedId)?.name || 'your board');

    document.getElementById('success-board').textContent = boardName;
    document.getElementById('open-app-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: appUrl });
      window.close();
    });
    showState('success-state');
  } catch (err) {
    saveBtn.disabled = false;
    label.textContent = 'Save to TravelPanel';
    errorEl.textContent = 'Could not save. Check your TravelPanel URL in settings.';
    errorEl.classList.remove('hidden');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showState(id) {
  document.querySelectorAll('.state').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin'))                   return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') ||
      url.includes('xhs.link'))                                                     return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') ||
      url.includes('tiktok.com'))                                                   return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv'))                      return 'bilibili';
  return 'other';
}

document.addEventListener('DOMContentLoaded', init);
