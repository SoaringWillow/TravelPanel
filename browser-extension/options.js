'use strict';

const input = document.getElementById('app-url');
const saveBtn = document.getElementById('save-btn');
const statusMsg = document.getElementById('status-msg');

// Load saved value
chrome.storage.sync.get({ appUrl: 'http://localhost:3000' }, data => {
  input.value = data.appUrl;
});

function showStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = `status-msg ${type}`;
  setTimeout(() => {
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';
  }, 2500);
}

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '');

  if (!url) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    new URL(url);
  } catch {
    showStatus('Invalid URL — must start with http:// or https://', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Failed to save. Try again.', 'error');
    } else {
      showStatus('✓ Saved!', 'success');
    }
  });
});

// Save on Enter key
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveBtn.click();
});
