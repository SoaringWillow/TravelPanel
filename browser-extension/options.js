'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function init() {
  const urlInput  = document.getElementById('app-url');
  const saveBtn   = document.getElementById('save-btn');
  const indicator = document.getElementById('saved-indicator');

  // Load saved URL
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
    urlInput.value = appUrl;
  });

  saveBtn.addEventListener('click', () => {
    const value = urlInput.value.trim() || DEFAULT_APP_URL;

    // Basic URL validation
    try {
      new URL(value);
    } catch {
      urlInput.style.borderColor = '#f87171';
      urlInput.focus();
      return;
    }
    urlInput.style.borderColor = '';

    chrome.storage.sync.set({ appUrl: value }, () => {
      indicator.classList.add('visible');
      setTimeout(() => indicator.classList.remove('visible'), 2000);
    });
  });

  // Save on Enter key
  urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

document.addEventListener('DOMContentLoaded', init);
