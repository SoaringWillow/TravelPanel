'use strict';

const DEFAULT_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const savedMsg    = document.getElementById('savedMsg');
  const shortcutDisplay = document.getElementById('shortcutDisplay');

  // Show platform-appropriate shortcut
  if (navigator.platform.startsWith('Mac')) {
    shortcutDisplay.textContent = '⌘⇧S';
  }

  // Load saved settings
  chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL }, ({ travelpanelUrl }) => {
    appUrlInput.value = travelpanelUrl;
  });

  function save() {
    const url = appUrlInput.value.trim() || DEFAULT_URL;
    chrome.storage.sync.set({ travelpanelUrl: url }, () => {
      savedMsg.classList.add('show');
      setTimeout(() => savedMsg.classList.remove('show'), 2500);
    });
  }

  saveBtn.addEventListener('click', save);
  appUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
});
