'use strict';

const input = document.getElementById('urlInput');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');

// Load saved URL
chrome.storage.sync.get(['travelpanelUrl'], (result) => {
  if (result.travelpanelUrl) {
    input.value = result.travelpanelUrl;
  }
});

saveBtn.addEventListener('click', () => {
  let url = input.value.trim().replace(/\/$/, '');

  // Basic validation
  if (!url) {
    input.focus();
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
    input.value = url;
  }

  chrome.storage.sync.set({ travelpanelUrl: url }, () => {
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
