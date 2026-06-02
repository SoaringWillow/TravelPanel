'use strict';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.textContent = type === 'success' ? `✓ ${msg}` : `⚠ ${msg}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('baseUrl');

  // Load saved settings
  chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL }, ({ baseUrl }) => {
    input.value = baseUrl;
  });

  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    let url = input.value.trim();
    if (!url) {
      showToast('Please enter a URL.', 'error');
      return;
    }

    // Normalize: strip trailing slash, ensure scheme
    if (!/^https?:\/\//.test(url)) url = 'http://' + url;
    url = url.replace(/\/$/, '');

    try {
      new URL(url); // validate
    } catch {
      showToast('Invalid URL — include https:// or http://', 'error');
      return;
    }

    chrome.storage.sync.set({ baseUrl: url }, () => {
      if (chrome.runtime.lastError) {
        showToast('Failed to save: ' + chrome.runtime.lastError.message, 'error');
      } else {
        input.value = url;
        showToast('Settings saved!');
      }
    });
  });
});
