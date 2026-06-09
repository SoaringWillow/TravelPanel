'use strict';

const input   = document.getElementById('tpUrl');
const saveBtn = document.getElementById('saveBtn');
const toast   = document.getElementById('toast');

// Load saved URL on open
chrome.storage.sync.get('travelpanelUrl', ({ travelpanelUrl }) => {
  if (travelpanelUrl) input.value = travelpanelUrl;
});

// Save on button click
saveBtn.addEventListener('click', () => {
  const raw = input.value.trim().replace(/\/+$/, '');
  let url = raw;
  if (url && !url.startsWith('http')) url = 'https://' + url;

  chrome.storage.sync.set({ travelpanelUrl: url }, () => {
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  });
});

// Also save on Enter
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
