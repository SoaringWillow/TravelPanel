'use strict';

async function init() {
  const { appUrl } = await chrome.storage.sync.get('appUrl');
  if (appUrl) {
    document.getElementById('app-url').value = appUrl;
  }

  document.getElementById('btn-save').addEventListener('click', async () => {
    const raw = document.getElementById('app-url').value.trim();
    if (!raw) return;

    // Normalize: ensure https:// prefix
    const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    await chrome.storage.sync.set({ appUrl: url });

    // Update input with normalized value
    document.getElementById('app-url').value = url;

    const badge = document.getElementById('save-status');
    badge.classList.remove('hidden');
    setTimeout(() => badge.classList.add('hidden'), 2500);
  });

  // Save on Enter
  document.getElementById('app-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-save').click();
  });
}

init();
