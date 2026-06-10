'use strict';

async function init() {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const statusEl    = document.getElementById('status');

  // Load saved value
  const stored = await chrome.storage.sync.get('travelPanelUrl');
  if (stored.travelPanelUrl) {
    appUrlInput.value = stored.travelPanelUrl;
  }

  // Save on button click
  saveBtn.addEventListener('click', async () => {
    const raw = appUrlInput.value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ travelPanelUrl: raw });

    statusEl.classList.add('show');
    setTimeout(() => statusEl.classList.remove('show'), 2200);
  });

  // Also save on Enter
  appUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

init().catch(console.error);
