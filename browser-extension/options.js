const DEFAULT_URL = 'https://travel-panel.vercel.app';

const inputUrl  = document.getElementById('input-url');
const btnSave   = document.getElementById('btn-save');
const btnReset  = document.getElementById('btn-reset');
const statusEl  = document.getElementById('status');

// Load saved value
chrome.storage.sync.get('travelPanelUrl', ({ travelPanelUrl }) => {
  inputUrl.value = travelPanelUrl || DEFAULT_URL;
});

function showStatus(message, type) {
  statusEl.textContent  = message;
  statusEl.className    = type; // 'ok' | 'error'
  setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 2500);
}

btnSave.addEventListener('click', () => {
  const raw = inputUrl.value.trim();
  if (!raw) {
    showStatus('URL cannot be empty', 'error');
    return;
  }
  try {
    new URL(raw); // validate
  } catch {
    showStatus('Enter a valid URL', 'error');
    return;
  }
  chrome.storage.sync.set({ travelPanelUrl: raw.replace(/\/$/, '') }, () => {
    showStatus('✓ Saved', 'ok');
  });
});

btnReset.addEventListener('click', () => {
  inputUrl.value = DEFAULT_URL;
  chrome.storage.sync.set({ travelPanelUrl: DEFAULT_URL }, () => {
    showStatus('✓ Reset to default', 'ok');
  });
});
