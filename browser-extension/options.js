'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const urlInput  = document.getElementById('appUrl');
  const saveBtn   = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Load saved setting
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
    urlInput.value = appUrl;
  });

  saveBtn.addEventListener('click', () => {
    let appUrl = urlInput.value.trim();

    // Validate — must be a URL
    if (!appUrl) {
      appUrl = DEFAULT_APP_URL;
      urlInput.value = appUrl;
    }
    try {
      new URL(appUrl); // throws if invalid
    } catch {
      urlInput.focus();
      urlInput.style.borderColor = '#ef4444';
      setTimeout(() => { urlInput.style.borderColor = ''; }, 1500);
      return;
    }

    // Strip trailing slash
    appUrl = appUrl.replace(/\/$/, '');

    chrome.storage.sync.set({ appUrl }, () => {
      statusMsg.classList.add('visible');
      setTimeout(() => statusMsg.classList.remove('visible'), 2000);
    });
  });

  // Allow saving with Enter
  urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
