'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

async function init() {
  const input     = document.getElementById('app-url');
  const saveBtn   = document.getElementById('save-btn');
  const statusEl  = document.getElementById('status');

  // Load saved value
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get('appUrl');
  input.value = appUrl;

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    setTimeout(() => { statusEl.className = 'status'; }, 3000);
  }

  saveBtn.addEventListener('click', async () => {
    const raw = input.value.trim().replace(/\/$/, ''); // strip trailing slash

    if (!raw) {
      showStatus('Please enter a URL.', 'error');
      return;
    }

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      showStatus('Please enter a valid http:// or https:// URL.', 'error');
      return;
    }

    await chrome.storage.sync.set({ appUrl: raw });
    input.value = raw;
    showStatus('Settings saved!', 'success');
  });

  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

document.addEventListener('DOMContentLoaded', init);
