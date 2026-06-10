'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

async function load() {
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  document.getElementById('appUrl').value = appUrl;
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const appUrl = document.getElementById('appUrl').value.trim() || DEFAULT_APP_URL;
  await chrome.storage.sync.set({ appUrl });

  const status = document.getElementById('status');
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
});

load();
