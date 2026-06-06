'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const appUrlInput = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const toast = document.getElementById('toast');
const welcomeBanner = document.getElementById('welcomeBanner');

const params = new URLSearchParams(location.search);
if (params.get('welcome') === '1') {
  welcomeBanner.classList.add('show');
}

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
    showToast('Settings saved!');
  });
});

resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, () => {
    showToast('Reset to default');
  });
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
