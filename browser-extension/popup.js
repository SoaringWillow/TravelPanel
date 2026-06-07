'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = {
  'instagram.com': 'Instagram',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'xiaohongshu.com': 'Xiaohongshu',
  'xhslink.com': 'Xiaohongshu',
  'tiktok.com': 'TikTok',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  'tripadvisor.com': 'TripAdvisor',
  'maps.google.com': 'Google Maps',
  'airbnb.com': 'Airbnb',
  'booking.com': 'Booking.com',
  'lonelyplanet.com': 'Lonely Planet',
  'timeout.com': 'Time Out',
  'eater.com': 'Eater',
  'yelp.com': 'Yelp',
  'atlasobscura.com': 'Atlas Obscura',
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, name] of Object.entries(PLATFORMS)) {
      if (hostname.endsWith(domain) || hostname === domain) return name;
    }
  } catch {}
  return null;
}

let currentTab = null;
let selectedBoard = 'Inbox';
let appUrl = DEFAULT_APP_URL;

async function init() {
  const stored = await chrome.storage.local.get(['appUrl', 'recentBoards']);
  if (stored.appUrl) appUrl = stored.appUrl;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Populate page info
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const badgeEl = document.getElementById('platform-badge');

  titleEl.textContent = tab.title || 'Unknown page';
  urlEl.textContent = tab.url;

  const platform = detectPlatform(tab.url || '');
  if (platform) {
    badgeEl.textContent = platform;
    badgeEl.classList.remove('hidden');
  }

  // Render board chips (Inbox + up to 4 recent)
  const recentBoards = stored.recentBoards || [];
  const boards = ['Inbox', ...recentBoards.filter(b => b !== 'Inbox').slice(0, 4)];
  renderBoards(boards);

  // Wire up new board input
  const newBoardInput = document.getElementById('new-board-input');
  newBoardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = newBoardInput.value.trim();
      if (name) selectBoard(name);
      newBoardInput.value = '';
    }
  });
  newBoardInput.addEventListener('blur', () => {
    const name = newBoardInput.value.trim();
    if (name) {
      selectBoard(name);
      newBoardInput.value = '';
    }
  });

  // Wire up buttons
  document.getElementById('save-btn').addEventListener('click', handleSave);

  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('settings-back').addEventListener('click', closeSettings);
  document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);

  // Populate settings input with current value
  document.getElementById('app-url-input').value = appUrl;
}

function renderBoards(boards) {
  const container = document.getElementById('boards');
  container.innerHTML = '';

  for (const board of boards) {
    const chip = makeChip(board);
    container.appendChild(chip);
  }
}

function makeChip(board) {
  const chip = document.createElement('button');
  chip.className = 'board-chip' + (board === selectedBoard ? ' active' : '');
  chip.dataset.board = board;
  chip.textContent = board === 'Inbox' ? '📥 Inbox' : board;
  chip.addEventListener('click', () => selectBoard(board));
  return chip;
}

function selectBoard(name) {
  selectedBoard = name;

  const container = document.getElementById('boards');
  // Add chip if not already present
  const existing = container.querySelector(`[data-board="${CSS.escape(name)}"]`);
  if (!existing) {
    const chip = makeChip(name);
    container.appendChild(chip);
  }

  container.querySelectorAll('.board-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.board === name);
  });
}

async function handleSave() {
  if (!currentTab) return;

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Opening…
  `;

  // Persist this board to recent list
  const stored = await chrome.storage.local.get(['recentBoards']);
  const recentBoards = stored.recentBoards || [];
  const updated = [selectedBoard, ...recentBoards.filter(b => b !== selectedBoard)].slice(0, 10);
  await chrome.storage.local.set({ recentBoards: updated });

  // Build the share URL
  const shareUrl = new URL(`${appUrl}/share`);
  shareUrl.searchParams.set('url', currentTab.url);
  if (currentTab.title) shareUrl.searchParams.set('title', currentTab.title);
  if (selectedBoard !== 'Inbox') shareUrl.searchParams.set('board', selectedBoard);

  chrome.tabs.create({ url: shareUrl.toString() });

  showSuccess();
}

function showSuccess() {
  const content = document.getElementById('popup-content');
  content.innerHTML = `
    <div class="success-state">
      <div class="success-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div class="success-title">Clipped!</div>
      <div class="success-subtitle">Opening TravelPanel to save<br>to <strong>${selectedBoard}</strong></div>
    </div>
  `;
  setTimeout(() => window.close(), 1600);
}

function openSettings() {
  document.getElementById('settings-panel').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settings-panel').classList.add('hidden');
}

async function handleSaveSettings() {
  const input = document.getElementById('app-url-input');
  let url = input.value.trim();
  if (!url) url = DEFAULT_APP_URL;
  // Normalize: strip trailing slash
  url = url.replace(/\/$/, '');
  appUrl = url;
  await chrome.storage.local.set({ appUrl: url });
  closeSettings();
}

// Inject spin keyframes into head (avoids needing a separate CSS file for this one rule)
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', init);
