'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const inputEl = document.getElementById('app-url');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const statusEl = document.getElementById('status');
const openAppLink = document.getElementById('open-app-link');

function showStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 3000);
}

function updateOpenLink(url) {
  const resolved = (url || '').trim() || DEFAULT_APP_URL;
  openAppLink.href = resolved;
}

// Load saved value
chrome.storage.sync.get(['appUrl'], result => {
  const saved = (result.appUrl || '').trim();
  inputEl.value = saved;
  updateOpenLink(saved);
});

inputEl.addEventListener('input', () => {
  updateOpenLink(inputEl.value);
});

saveBtn.addEventListener('click', () => {
  const raw = inputEl.value.trim();

  if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
    showStatus('error', 'URL must start with http:// or https://');
    return;
  }

  chrome.storage.sync.set({ appUrl: raw }, () => {
    showStatus('success', 'Saved!');
    updateOpenLink(raw);
  });
});

resetBtn.addEventListener('click', () => {
  inputEl.value = '';
  chrome.storage.sync.set({ appUrl: '' }, () => {
    showStatus('success', `Reset to default (${DEFAULT_APP_URL})`);
    updateOpenLink('');
  });
});
