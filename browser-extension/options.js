'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('appUrl');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const savedMsg = document.getElementById('savedMsg');

  let savedMsgTimer = null;

  function showSaved(msg = '✓ Settings saved') {
    savedMsg.textContent = msg;
    savedMsg.classList.remove('hidden');
    clearTimeout(savedMsgTimer);
    savedMsgTimer = setTimeout(() => savedMsg.classList.add('hidden'), 2500);
  }

  // Load current setting
  chrome.storage.sync.get('appUrl', (data) => {
    input.value = data.appUrl || '';
  });

  saveBtn.addEventListener('click', () => {
    const url = input.value.trim();

    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      input.style.borderColor = '#dc2626';
      input.focus();
      setTimeout(() => { input.style.borderColor = ''; }, 2000);
      return;
    }

    chrome.storage.sync.set({ appUrl: url || DEFAULT_APP_URL }, showSaved);
  });

  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.remove('appUrl', () => {
      input.value = '';
      showSaved('✓ Reset to default');
    });
  });

  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
