'use strict';

const STORAGE_KEY = 'travelpanel_url';

document.addEventListener('DOMContentLoaded', () => {
  const input    = document.getElementById('tp-url');
  const saveBtn  = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');

  // Load saved URL on mount
  chrome.storage.sync.get([STORAGE_KEY], (result) => {
    if (result[STORAGE_KEY]) {
      input.value = result[STORAGE_KEY];
    }
  });

  // Quick-fill buttons
  document.querySelectorAll('.example-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.url;
      input.focus();
    });
  });

  // Save on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });

  // Save button
  saveBtn.addEventListener('click', saveSettings);

  function saveSettings() {
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) {
      input.style.borderColor = '#EF4444';
      input.focus();
      setTimeout(() => { input.style.borderColor = ''; }, 1200);
      return;
    }

    chrome.storage.sync.set({ [STORAGE_KEY]: url }, () => {
      savedMsg.style.display = 'block';
      setTimeout(() => { savedMsg.style.display = 'none'; }, 3000);
    });
  }
});
