'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const resetBtn    = document.getElementById('resetBtn');
const statusMsg   = document.getElementById('statusMsg');
const versionLabel = document.getElementById('versionLabel');

// Show extension version
const manifest = chrome.runtime.getManifest();
versionLabel.textContent = `v${manifest.version}`;

// Load saved settings
chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
  appUrlInput.value = data.appUrl;
});

function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className   = `status ${type}`;
  statusMsg.hidden      = false;
  setTimeout(() => { statusMsg.hidden = true; }, 2500);
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Save settings
document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const appUrl = appUrlInput.value.trim().replace(/\/$/, '');
  if (!isValidUrl(appUrl)) {
    showStatus('Please enter a valid URL (http:// or https://)', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl }, () => {
    showStatus('Settings saved!', 'success');
  });
});

// Reset to default
resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, () => {
    showStatus('Reset to default URL.', 'success');
  });
});
