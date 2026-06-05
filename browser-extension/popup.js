// Platform detection (mirrors lib/parse-url.ts)
function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin/TikTok',
  bilibili: 'Bilibili',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat:       { bg: '#07C16018', text: '#07C160', border: '#07C16040' },
  xiaohongshu:  { bg: '#FF244218', text: '#FF2442', border: '#FF244240' },
  douyin:       { bg: '#ffffff18', text: '#ccccdd', border: '#ffffff30' },
  bilibili:     { bg: '#00AEEC18', text: '#00AEEC', border: '#00AEEC40' },
  instagram:    { bg: '#E134A618', text: '#E134A6', border: '#E134A640' },
  youtube:      { bg: '#FF000018', text: '#FF0000', border: '#FF000040' },
  other:        { bg: '#7c6fe018', text: '#a78bfa', border: '#7c6fe040' },
};

// State
let currentUrl = '';
let currentTitle = '';
let selectedBoardId = null; // null = Inbox
let boards = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function getHostname(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ travelpanelUrl: 'http://localhost:3000' }, resolve);
  });
}

async function getStoredBoards() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ boards: [] }, (r) => resolve(r.boards));
  });
}

// ─── UI Updates ───────────────────────────────────────────────────────────────

function renderBoards() {
  const list = document.getElementById('boardsList');
  list.innerHTML = '';

  // Inbox option (always first)
  const inbox = makeBoard(null, '📥', 'Inbox', '');
  list.appendChild(inbox);

  if (boards.length === 0) {
    const note = document.createElement('div');
    note.className = 'no-boards';
    note.textContent = 'Open TravelPanel to see your boards here.';
    list.appendChild(note);
    return;
  }

  boards.slice(0, 5).forEach((b) => {
    list.appendChild(makeBoard(b.id, b.emoji || '🗺', b.name, b.itemIds?.length ?? ''));
  });
}

function makeBoard(id, emoji, name, count) {
  const btn = document.createElement('button');
  btn.className = 'board-item' + (selectedBoardId === id ? ' selected' : '');
  btn.innerHTML = `
    <span class="board-emoji">${emoji}</span>
    <span class="board-name">${name}</span>
    ${count !== '' ? `<span class="board-count">${count}</span>` : ''}
    <svg class="check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;
  btn.addEventListener('click', () => {
    selectedBoardId = id;
    document.querySelectorAll('.board-item').forEach((el) => el.classList.remove('selected'));
    btn.classList.add('selected');
  });
  return btn;
}

function setPlatformBadge(platform) {
  const badge = document.getElementById('platformBadge');
  const label = PLATFORM_LABELS[platform] || 'Web';
  const colors = PLATFORM_COLORS[platform] || PLATFORM_COLORS.other;

  if (platform === 'other') {
    badge.style.display = 'none';
    return;
  }

  badge.style.display = '';
  badge.textContent = label;
  badge.style.background = colors.bg;
  badge.style.color = colors.text;
  badge.style.border = `1px solid ${colors.border}`;
}

function setLoading(loading) {
  document.getElementById('clipSpinner').style.display = loading ? 'block' : 'none';
  document.getElementById('clipIcon').style.display = loading ? 'none' : 'block';
  document.getElementById('clipBtn').disabled = loading;
  document.getElementById('clipBtnText').textContent = loading ? 'Opening TravelPanel…' : 'Clip to TravelPanel';
}

function showSuccess(boardName) {
  document.getElementById('mainContent').style.display = 'none';
  const sv = document.getElementById('successView');
  sv.style.display = 'flex';
  document.getElementById('successSubtitle').textContent =
    boardName ? `Saved to "${boardName}"` : 'Saved to Inbox';
  setTimeout(() => window.close(), 1800);
}

// ─── Core Action ─────────────────────────────────────────────────────────────

async function clipToTravelPanel() {
  if (!currentUrl) return;
  setLoading(true);

  const { travelpanelUrl } = await getSettings();
  const base = travelpanelUrl.replace(/\/$/, '');

  const params = new URLSearchParams({ url: currentUrl, title: currentTitle });
  if (selectedBoardId) params.set('boardId', selectedBoardId);

  const shareUrl = `${base}/share?${params}`;

  try {
    await chrome.tabs.create({ url: shareUrl, active: true });
    const board = boards.find((b) => b.id === selectedBoardId);
    showSuccess(board?.name ?? null);
  } catch (e) {
    setLoading(false);
    document.getElementById('clipBtnText').textContent = 'Error — check settings';
  }
}

async function openApp() {
  const { travelpanelUrl } = await getSettings();
  const params = new URLSearchParams({ import: currentUrl });
  const target = `${travelpanelUrl.replace(/\/$/, '')}/?${params}`;
  chrome.tabs.create({ url: target, active: true });
  window.close();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load boards from Chrome storage (synced from TravelPanel content script)
  boards = await getStoredBoards();
  renderBoards();

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentUrl = tab.url || '';
  currentTitle = tab.title || getHostname(currentUrl);

  // Update URL card
  document.getElementById('pageTitle').textContent = truncate(currentTitle, 50);
  document.getElementById('urlText').textContent = truncate(currentUrl, 55);

  // Favicon
  if (tab.favIconUrl) {
    const img = document.getElementById('favicon');
    const placeholder = document.getElementById('faviconPlaceholder');
    img.onload = () => { img.style.display = ''; placeholder.style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; placeholder.style.display = ''; };
    img.src = tab.favIconUrl;
  }

  // Platform badge
  const platform = detectPlatform(currentUrl);
  setPlatformBadge(platform);

  // Disable clip if no valid URL
  if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('about:')) {
    document.getElementById('clipBtn').disabled = true;
    document.getElementById('clipBtnText').textContent = 'No page to clip';
    document.getElementById('pageTitle').textContent = 'Browser page';
    document.getElementById('urlText').textContent = 'Navigate to a travel page to clip it';
  }

  // Wire buttons
  document.getElementById('clipBtn').addEventListener('click', clipToTravelPanel);
  document.getElementById('openAppBtn').addEventListener('click', openApp);
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
