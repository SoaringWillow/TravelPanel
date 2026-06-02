'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

// Platform detection mirrors lib/parse-url.ts
const PLATFORMS = [
  { id: 'wechat',       test: u => /weixin\.qq\.com|mp\.weixin/i.test(u),               label: 'WeChat',          color: '#07C160', bg: '#F0FFF4' },
  { id: 'xiaohongshu',  test: u => /xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(u),  label: '小红书',           color: '#FF2442', bg: '#FFF1F2' },
  { id: 'douyin',       test: u => /douyin\.com|iesdouyin\.com|tiktok\.com/i.test(u),   label: 'TikTok/Douyin',   color: '#161823', bg: '#F3F4F6' },
  { id: 'bilibili',     test: u => /bilibili\.com|b23\.tv/i.test(u),                    label: 'Bilibili',        color: '#00AEEC', bg: '#F0F9FF' },
  { id: 'instagram',    test: u => /instagram\.com/i.test(u),                           label: 'Instagram',       color: '#E4405F', bg: '#FFF1F2' },
  { id: 'youtube',      test: u => /youtube\.com|youtu\.be/i.test(u),                   label: 'YouTube',         color: '#FF0000', bg: '#FFF1F2' },
  { id: 'twitter',      test: u => /twitter\.com|x\.com/i.test(u),                      label: 'X/Twitter',       color: '#000000', bg: '#F3F4F6' },
  { id: 'pinterest',    test: u => /pinterest\.com/i.test(u),                           label: 'Pinterest',       color: '#E60023', bg: '#FFF1F2' },
  { id: 'other',        test: () => true,                                               label: 'Web',             color: '#4F46E5', bg: '#EEF2FF' },
];

function detectPlatform(url) {
  return PLATFORMS.find(p => p.test(url)) || PLATFORMS[PLATFORMS.length - 1];
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '') : '');
  } catch {
    return url.slice(0, 50);
  }
}

// --- State ---
let currentTab = null;
let selectedBoardId = '__inbox__';
let appUrl = DEFAULT_APP_URL;
let lastSavedItemId = null;

// --- DOM refs ---
const $ = id => document.getElementById(id);
const saveView    = $('saveView');
const loadingView = $('loadingView');
const successView = $('successView');
const errorView   = $('errorView');

function showView(name) {
  [saveView, loadingView, successView, errorView].forEach(el => {
    if (el) el.style.display = 'none';
    if (el) el.classList.remove('visible');
  });
  const target = $(`${name}View`);
  if (target) {
    target.style.display = 'block';
    target.classList.add('visible');
  }
}

// --- Board selection ---
function selectBoard(boardId) {
  selectedBoardId = boardId;
  document.querySelectorAll('.board-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.boardId === boardId);
  });
}

function renderBoards(boards) {
  const grid = $('boardGrid');
  // Keep inbox button, add recent boards
  const recentBoards = boards.slice(0, 4); // max 4 to keep UI clean
  recentBoards.forEach(board => {
    const btn = document.createElement('button');
    btn.className = 'board-btn';
    btn.dataset.boardId = board.id;
    btn.textContent = board.name;
    btn.title = board.name;
    btn.addEventListener('click', () => selectBoard(board.id));
    grid.appendChild(btn);
  });
}

// --- Load boards from app (via background message) ---
async function loadBoards() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_BOARDS', appUrl });
    if (response && response.boards) {
      renderBoards(response.boards);
    }
  } catch {
    // No boards loaded; inbox-only mode
  }
}

// --- Init ---
async function init() {
  // Load saved app URL from storage
  const stored = await chrome.storage.sync.get(['appUrl']);
  if (stored.appUrl) appUrl = stored.appUrl;

  // Show configured URL in footer
  const urlEl = $('configuredUrl');
  if (urlEl) {
    try {
      urlEl.textContent = new URL(appUrl).hostname;
    } catch {
      urlEl.textContent = appUrl.slice(0, 20);
    }
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url) {
    $('pageTitle').textContent = 'No page detected';
    return;
  }

  // Render page info
  const platform = detectPlatform(tab.url);
  const badge = $('platformBadge');
  badge.textContent = platform.label;
  badge.style.color = platform.color;
  badge.style.background = platform.bg;

  $('pageTitle').textContent = tab.title || tab.url;
  $('pageUrl').textContent = truncateUrl(tab.url);

  // Load boards
  await loadBoards();

  // Board button click handlers
  $('boardGrid').addEventListener('click', e => {
    const btn = e.target.closest('.board-btn');
    if (btn) selectBoard(btn.dataset.boardId);
  });

  // Save button
  $('saveBtn').addEventListener('click', handleSave);

  // Settings
  $('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open app button
  $('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
  });
}

// --- Save flow ---
async function handleSave() {
  if (!currentTab || !currentTab.url) return;

  $('saveBtn').disabled = true;
  showView('loading');

  try {
    const shareUrl = buildShareUrl(currentTab.url, currentTab.title || '');

    // Open the TravelPanel share page
    const newTab = await chrome.tabs.create({ url: shareUrl, active: false });
    lastSavedItemId = null;

    // Give the tab time to process, then check for completion via background
    // For now, show success immediately after opening share page
    setTimeout(async () => {
      // Try to get extraction results by polling the share page
      // Simpler: just show success with the share tab
      await chrome.tabs.update(newTab.id, { active: true });
      window.close();
    }, 800);

    // Show success
    showSuccess(currentTab.title || currentTab.url, null);

  } catch (err) {
    showError(err.message || 'Failed to open TravelPanel');
    $('saveBtn').disabled = false;
  }
}

function buildShareUrl(url, title) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url, title });
  return `${base}/share?${params.toString()}`;
}

function showSuccess(title, data) {
  const msg = $('successMsg');
  const board = selectedBoardId === '__inbox__' ? 'Inbox' : 'your board';
  msg.textContent = `"${(title || '').slice(0, 40)}" saved to ${board}`;

  // Show extraction metadata if available
  if (data) {
    const lc = data.locations?.length || 0;
    const sc = data.substance?.length || 0;
    if (lc > 0 || sc > 0) {
      $('locationCount').textContent = lc;
      $('substanceCount').textContent = sc;
      $('successMeta').style.display = 'flex';
    }
  }

  showView('success');
  $('saveAnotherBtn').addEventListener('click', () => {
    showView('save');
    $('saveBtn').disabled = false;
    $('successMeta').style.display = 'none';
  });
  $('viewInAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

function showError(msg) {
  $('errorMsg').textContent = msg || 'Something went wrong. Please try again.';
  showView('error');
  $('retryBtn').addEventListener('click', () => {
    showView('save');
    $('saveBtn').disabled = false;
  });
  $('openSettingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// --- Start ---
init().catch(err => {
  console.error('TravelPanel extension error:', err);
  showError('Extension error: ' + err.message);
});
