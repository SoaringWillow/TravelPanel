const DEFAULT_URL = 'https://travelpanel.vercel.app';
const BLOCKED_SCHEMES = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'file://'];

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL, savedBoards: [] }, resolve);
  });
}

function isBlockedPage(url) {
  return !url || BLOCKED_SCHEMES.some((s) => url.startsWith(s));
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    return url.slice(0, 50);
  }
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const faviconEl = document.getElementById('page-favicon');
  const saveBtn = document.getElementById('save-btn');
  const saveBtnText = document.getElementById('save-btn-text');
  const boardSelect = document.getElementById('board-select');
  const newBoardRow = document.getElementById('new-board-row');
  const newBoardInput = document.getElementById('new-board-input');
  const successMsg = document.getElementById('success-msg');
  const errorMsg = document.getElementById('error-msg');
  const errorText = document.getElementById('error-text');
  const statusBlocked = document.getElementById('status-blocked');
  const optionsBtn = document.getElementById('options-btn');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { travelPanelUrl, savedBoards } = await getSettings();

  // Populate page info
  titleEl.textContent = tab?.title || 'Untitled page';
  const pageUrl = tab?.url || '';
  urlEl.textContent = shortenUrl(pageUrl);

  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
  } else {
    faviconEl.style.display = 'none';
  }

  // Block internal browser pages
  if (isBlockedPage(pageUrl)) {
    show(statusBlocked);
    saveBtn.disabled = true;
    hide(document.querySelector('.board-section'));
  }

  // Populate board selector from saved boards
  savedBoards.forEach(({ name, emoji }) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${emoji || '📋'} ${name}`;
    // Insert before the "New board…" option
    boardSelect.insertBefore(opt, boardSelect.lastElementChild);
  });

  // Handle board select change
  boardSelect.addEventListener('change', () => {
    if (boardSelect.value === '__new__') {
      show(newBoardRow);
      newBoardInput.focus();
    } else {
      hide(newBoardRow);
    }
  });

  // Handle options button
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Handle save button
  saveBtn.addEventListener('click', async () => {
    if (saveBtn.disabled) return;

    let boardName = boardSelect.value;

    // If creating a new board, validate the name input
    if (boardName === '__new__') {
      const name = newBoardInput.value.trim();
      if (!name) {
        newBoardInput.focus();
        return;
      }
      boardName = name;

      // Persist the new board name so it shows up next time
      const updated = [...savedBoards, { name, emoji: '📋' }];
      chrome.storage.sync.set({ savedBoards: updated });
    }

    saveBtn.disabled = true;
    saveBtnText.textContent = 'Opening TravelPanel…';

    try {
      const shareUrl = new URL('/share', travelPanelUrl);
      shareUrl.searchParams.set('url', pageUrl);
      if (tab?.title) shareUrl.searchParams.set('title', tab.title);
      if (boardName && boardName !== '') shareUrl.searchParams.set('board', boardName);
      shareUrl.searchParams.set('source', 'browser-extension');

      await chrome.tabs.create({ url: shareUrl.toString() });

      show(successMsg);
      hide(errorMsg);

      // Close popup after brief delay
      setTimeout(() => window.close(), 800);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtnText.textContent = 'Save to TravelPanel';
      errorText.textContent = err?.message || 'Something went wrong.';
      show(errorMsg);
      hide(successMsg);
    }
  });
});
