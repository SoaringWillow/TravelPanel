'use strict';

const input = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const savedMsg = document.getElementById('savedMsg');

// Load saved URL on open
chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) input.value = result.appUrl;
});

saveBtn.addEventListener('click', save);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

function save() {
  let url = input.value.trim().replace(/\/$/, ''); // strip trailing slash

  if (!url) {
    input.focus();
    return;
  }

  // Prepend https:// if the user left it out
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    input.value = url;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 2000);
  });
}
