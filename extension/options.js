const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const appUrlInput = document.getElementById('app-url');
const btnSave     = document.getElementById('btn-save');
const btnReset    = document.getElementById('btn-reset');
const toast       = document.getElementById('toast');

// ── Load saved settings ────────────────────────────────────────────────────

chrome.storage.sync.get('appUrl', ({ appUrl }) => {
  appUrlInput.value = appUrl || DEFAULT_APP_URL;
});

// ── Save ───────────────────────────────────────────────────────────────────

btnSave.addEventListener('click', () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '');
  if (!url) return;

  chrome.storage.sync.set({ appUrl: url }, () => {
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  });
});

// ── Reset ──────────────────────────────────────────────────────────────────

btnReset.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
});
