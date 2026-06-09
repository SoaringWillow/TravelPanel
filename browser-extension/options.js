'use strict';

const input     = document.getElementById('appUrlInput');
const saveBtn   = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');

// Load saved URL
chrome.storage.sync.get('appUrl', ({ appUrl }) => {
  if (appUrl) input.value = appUrl;
});

// Enable save button when input has content
input.addEventListener('input', () => {
  const val = input.value.trim();
  saveBtn.disabled = !val || !val.startsWith('http');
  statusMsg.textContent = '';
  statusMsg.className = 'status-msg';
});

// Save
saveBtn.addEventListener('click', async () => {
  let url = input.value.trim();
  if (!url) return;

  // Normalize: strip trailing slash
  url = url.replace(/\/$/, '');

  await chrome.storage.sync.set({ appUrl: url });

  // Notify background
  chrome.runtime.sendMessage({ type: 'APP_URL_UPDATED', appUrl: url });

  statusMsg.textContent = '✓ Saved!';
  statusMsg.className = 'status-msg';
  saveBtn.disabled = true;

  setTimeout(() => {
    statusMsg.textContent = '';
    saveBtn.disabled = false;
  }, 2500);
});
