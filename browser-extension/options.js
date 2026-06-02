const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const resetBtn    = document.getElementById('resetBtn');
const toastEl     = document.getElementById('toast');

function showToast(msg, type) {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
  setTimeout(() => { toastEl.className = 'toast'; }, 3000);
}

async function load() {
  const stored = await chrome.storage.sync.get('appUrl');
  appUrlInput.value = stored.appUrl || DEFAULT_APP_URL;
}

saveBtn.addEventListener('click', async () => {
  const raw = appUrlInput.value.trim().replace(/\/$/, '');
  if (!raw) {
    showToast('Please enter a valid URL.', 'error');
    return;
  }
  try {
    new URL(raw); // validate
  } catch {
    showToast('That doesn\'t look like a valid URL.', 'error');
    return;
  }
  await chrome.storage.sync.set({ appUrl: raw });
  showToast('Settings saved!', 'success');
});

resetBtn.addEventListener('click', async () => {
  await chrome.storage.sync.remove('appUrl');
  appUrlInput.value = DEFAULT_APP_URL;
  showToast('Reset to default URL.', 'success');
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

load().catch(console.error);
