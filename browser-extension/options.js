const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast visible' + (isError ? ' toast-error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function isValidUrl(str) {
  if (!str) return true; // empty = use default
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

async function init() {
  const input = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Load saved value
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  if (appUrl) input.value = appUrl;

  saveBtn.addEventListener('click', async () => {
    const raw = input.value.trim();
    if (!isValidUrl(raw)) {
      showToast('Please enter a valid URL (e.g. https://my-app.vercel.app)', true);
      return;
    }
    const url = raw.replace(/\/$/, ''); // strip trailing slash
    await chrome.storage.sync.set({ appUrl: url || DEFAULT_APP_URL });
    showToast('Settings saved!');
  });

  resetBtn.addEventListener('click', async () => {
    input.value = '';
    await chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
    showToast('Reset to default.');
  });

  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

document.addEventListener('DOMContentLoaded', init);
