'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
    document.getElementById('appUrl').value = appUrl || DEFAULT_APP_URL;
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const raw = document.getElementById('appUrl').value.trim().replace(/\/$/, '');
  if (!raw) return;

  chrome.storage.sync.set({ appUrl: raw }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 2500);
  });
});

document.getElementById('appUrl').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('saveBtn').click();
});
