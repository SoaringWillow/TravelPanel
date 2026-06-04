'use strict';

const input    = document.getElementById('app-url');
const saveBtn  = document.getElementById('save-btn');
const statusEl = document.getElementById('save-status');

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `save-status ${type}`;
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 3000);
}

// Load saved URL on open
chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) input.value = result.appUrl;
});

saveBtn.addEventListener('click', () => {
  let url = input.value.trim();

  if (!url) {
    showStatus('Please enter your TravelPanel URL.', 'error');
    return;
  }

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/\/$/, '');

  try {
    new URL(url);
  } catch {
    showStatus('That doesn\'t look like a valid URL.', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    input.value = url;
    showStatus('Settings saved!', 'success');
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
