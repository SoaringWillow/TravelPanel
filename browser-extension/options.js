'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const input   = document.getElementById('appUrlInput');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const status  = document.getElementById('status');

function showStatus(msg, type) {
  status.textContent = msg;
  status.className   = `status ${type}`;
  if (type === 'ok') setTimeout(() => { status.textContent = ''; }, 2500);
}

// Load saved value
chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
  input.value = appUrl || DEFAULT_APP_URL;
});

saveBtn.addEventListener('click', () => {
  const raw = input.value.trim();
  if (!raw) {
    showStatus('Please enter a URL.', 'err');
    return;
  }
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    chrome.storage.sync.set({ appUrl: url.origin }, () => {
      input.value = url.origin;
      showStatus('✓ Saved', 'ok');
    });
  } catch {
    showStatus('Invalid URL — include http:// or https://', 'err');
  }
});

resetBtn.addEventListener('click', () => {
  input.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: '' }, () => {
    showStatus('Reset to default', 'ok');
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
