'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function init() {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  appUrlInput.value = appUrl || DEFAULT_APP_URL;

  saveBtn.addEventListener('click', async () => {
    const value = appUrlInput.value.trim().replace(/\/$/, '');

    if (!value) {
      saveStatus.textContent = 'Please enter a URL.';
      saveStatus.style.color = '#f87171';
      return;
    }

    try {
      new URL(value);
    } catch {
      saveStatus.textContent = 'Invalid URL — include https://';
      saveStatus.style.color = '#f87171';
      return;
    }

    await chrome.storage.sync.set({ appUrl: value });
    saveStatus.textContent = 'Saved!';
    saveStatus.style.color = '#22c55e';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });

  appUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

init();
