'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const savedMsg    = document.getElementById('savedMsg');

  chrome.storage.sync.get({ appUrl: 'http://localhost:3000' }, result => {
    appUrlInput.value = result.appUrl || 'http://localhost:3000';
  });

  saveBtn.addEventListener('click', () => {
    const appUrl = appUrlInput.value.trim().replace(/\/$/, '');
    if (!appUrl) return;
    chrome.storage.sync.set({ appUrl }, () => {
      savedMsg.classList.add('show');
      setTimeout(() => savedMsg.classList.remove('show'), 2000);
    });
  });

  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
