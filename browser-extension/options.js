'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

async function init() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(['appUrl']),
    chrome.storage.local.get(['clipCount']),
  ]);

  document.getElementById('app-url').value = sync.appUrl ?? DEFAULT_APP_URL;
  document.getElementById('clip-count').textContent = String(local.clipCount ?? 0);
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const raw = document.getElementById('app-url').value.trim();
  const appUrl = raw.replace(/\/$/, '') || DEFAULT_APP_URL;

  await chrome.storage.sync.set({ appUrl });

  const msg = document.getElementById('success-msg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 2000);
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  await chrome.storage.local.set({ clipCount: 0 });
  document.getElementById('clip-count').textContent = '0';
  chrome.action.setBadgeText({ text: '' });
});

init();
