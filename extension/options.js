const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('app-url');
const saveBtn     = document.getElementById('save-btn');
const resetBtn    = document.getElementById('reset-btn');
const statusEl    = document.getElementById('status');
const versionEl   = document.getElementById('version');

// Load current settings
chrome.storage.local.get(['appUrl'], ({ appUrl }) => {
  appUrlInput.value = appUrl || DEFAULT_APP_URL;
});

// Show version from manifest
const manifest = chrome.runtime.getManifest();
versionEl.textContent = manifest.version;

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim();
  if (!url) {
    showStatus('Please enter a URL.', true);
    return;
  }
  try {
    new URL(url); // validate
  } catch {
    showStatus('Invalid URL. Include https://', true);
    return;
  }

  chrome.storage.local.set({ appUrl: url }, () => {
    showStatus('Settings saved!');
  });
});

resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.local.set({ appUrl: DEFAULT_APP_URL }, () => {
    showStatus('Reset to default.');
  });
});

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#ef4444' : '#22c55e';
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
}
