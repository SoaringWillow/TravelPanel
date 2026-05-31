'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const status      = document.getElementById('status');

  // Show platform-appropriate keyboard shortcut
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const kbdEl = document.getElementById('kbdShortcut');
  if (!isMac) {
    kbdEl.innerHTML = '<kbd>Alt</kbd><kbd>Shift</kbd><kbd>T</kbd>';
  }

  // Load saved settings
  chrome.storage.sync.get(['appUrl'], result => {
    appUrlInput.value = result.appUrl || DEFAULT_APP_URL;
  });

  saveBtn.addEventListener('click', () => {
    const raw    = appUrlInput.value.trim();
    const appUrl = raw || DEFAULT_APP_URL;

    chrome.storage.sync.set({ appUrl }, () => {
      status.classList.add('visible');
      setTimeout(() => status.classList.remove('visible'), 2000);
    });
  });

  // Save on Enter
  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
