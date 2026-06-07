'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const input  = document.getElementById('appUrl');
const btn    = document.getElementById('saveBtn');
const status = document.getElementById('status');

// Load saved value
chrome.storage.sync.get(['appUrl'], (result) => {
  input.value = result.appUrl || '';
  input.placeholder = DEFAULT_APP_URL;
});

btn.addEventListener('click', () => {
  const raw = input.value.trim();

  if (raw && !isValidUrl(raw)) {
    showStatus('Please enter a valid URL (e.g. https://travelpanel.vercel.app)', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl: raw || DEFAULT_APP_URL }, () => {
    showStatus('Saved!', 'ok');
  });
});

function isValidUrl(str) {
  try { new URL(str); return true; } catch (_) { return false; }
}

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  setTimeout(() => { status.className = 'status hidden'; }, 2500);
}
