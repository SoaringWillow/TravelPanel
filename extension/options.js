'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

async function load() {
  const result = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  document.getElementById('appUrl').value = result.appUrl;
}

function showToast() {
  const toast = document.getElementById('savedToast');
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}

document.getElementById('btnSave').addEventListener('click', async () => {
  const raw = document.getElementById('appUrl').value.trim();
  const appUrl = raw || DEFAULT_APP_URL;

  // Basic validation
  try {
    new URL(appUrl);
  } catch {
    document.getElementById('appUrl').style.borderColor = '#ef4444';
    setTimeout(() => (document.getElementById('appUrl').style.borderColor = ''), 1500);
    return;
  }

  await chrome.storage.sync.set({ appUrl });
  showToast();
});

document.getElementById('btnReset').addEventListener('click', async () => {
  await chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  document.getElementById('appUrl').value = DEFAULT_APP_URL;
  showToast();
});

load();
