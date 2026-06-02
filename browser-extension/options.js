'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const savedMsg    = document.getElementById('savedMsg');

  chrome.storage.sync.get(['appUrl'], r => {
    appUrlInput.value = r.appUrl || '';
  });

  saveBtn.addEventListener('click', () => {
    const url = appUrlInput.value.trim().replace(/\/+$/, '');
    chrome.storage.sync.set({ appUrl: url }, () => {
      savedMsg.classList.remove('hidden');
      setTimeout(() => savedMsg.classList.add('hidden'), 2500);
    });
  });

  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
