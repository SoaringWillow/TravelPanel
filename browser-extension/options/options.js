'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function showStatus(msg, type = 'success') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  setTimeout(() => { el.className = 'status-msg'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const metaKey = document.getElementById('shortcut-meta');

  // Mac vs Windows shortcut label
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  if (metaKey) metaKey.textContent = isMac ? '⌘' : 'Ctrl';

  // Load saved settings
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
    urlInput.value = appUrl;
  });

  // Save
  saveBtn.addEventListener('click', () => {
    let url = urlInput.value.trim().replace(/\/$/, '');
    if (!url) {
      showStatus('Please enter a valid URL.', 'error');
      return;
    }
    try {
      new URL(url); // validates
    } catch {
      showStatus('Invalid URL format. Include https://', 'error');
      return;
    }
    chrome.storage.sync.set({ appUrl: url }, () => {
      showStatus('Settings saved!', 'success');
    });
  });

  // Reset to default
  resetBtn.addEventListener('click', () => {
    urlInput.value = DEFAULT_APP_URL;
    chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, () => {
      showStatus('Reset to default URL.', 'success');
    });
  });

  // Save on Enter
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
