'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const toast       = document.getElementById('toast');

// Load saved settings
chrome.storage.sync.get(['appUrl'], (result) => {
  appUrlInput.value = result.appUrl || DEFAULT_APP_URL;
});

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '');
  if (!url) {
    appUrlInput.value = DEFAULT_APP_URL;
    return;
  }
  chrome.storage.sync.set({ appUrl: url }, () => {
    showToast();
  });
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

function showToast() {
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2500);
}
