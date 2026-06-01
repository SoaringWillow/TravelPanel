'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const resetBtn    = document.getElementById('resetBtn');
const toast       = document.getElementById('toast');

// Load saved settings
chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (items) => {
  appUrlInput.value = items.appUrl;
});

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '');
  if (!url) {
    appUrlInput.focus();
    return;
  }
  chrome.storage.sync.set({ appUrl: url }, () => {
    showToast('Settings saved.');
  });
});

resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, () => {
    showToast('Reset to default.');
  });
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}
