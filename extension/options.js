'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const statusEl    = document.getElementById('status');
const kbdModEl    = document.getElementById('kbdMod');

// Show platform-appropriate shortcut modifier
const isMac = navigator.platform.toUpperCase().includes('MAC') ||
              navigator.userAgent.includes('Mac');
kbdModEl.textContent = isMac ? '⌘ Shift' : 'Alt+Shift';

// Load saved settings
chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
  appUrlInput.value = appUrl || DEFAULT_APP_URL;
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    appUrlInput.value = btn.dataset.url;
  });
});

// Save
saveBtn.addEventListener('click', () => {
  let url = appUrlInput.value.trim().replace(/\/$/, '');

  if (!url) {
    showStatus('error', 'Please enter a URL.');
    return;
  }

  try {
    new URL(url);
  } catch {
    showStatus('error', 'Enter a valid URL (e.g. http://localhost:3000).');
    return;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    if (chrome.runtime.lastError) {
      showStatus('error', 'Failed to save settings.');
      return;
    }
    showStatus('success', '✓ Settings saved!');
    setTimeout(() => { statusEl.className = 'status'; }, 2500);
  });
});

function showStatus(type, msg) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = msg;
}
