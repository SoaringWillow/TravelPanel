'use strict';

const STORAGE_KEY = 'travelPanelUrl';

async function init() {
  const { travelPanelUrl } = await chrome.storage.local.get(STORAGE_KEY);
  if (travelPanelUrl) {
    document.getElementById('url-input').value = travelPanelUrl;
  }

  document.getElementById('save-btn').addEventListener('click', async () => {
    let url = document.getElementById('url-input').value.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    url = url.replace(/\/$/, '');

    await chrome.storage.local.set({ [STORAGE_KEY]: url });

    const status = document.getElementById('save-status');
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2500);
  });

  document.getElementById('url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-btn').click();
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!confirm('Clear all TravelPanel Clipper settings?')) return;
    await chrome.storage.local.clear();
    document.getElementById('url-input').value = '';
  });
}

init();
