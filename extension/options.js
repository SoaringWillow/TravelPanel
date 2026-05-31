'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

async function init() {
  const input    = document.getElementById('app-url');
  const saveBtn  = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');

  // ── Load saved value ──────────────────────────────────────────────────────
  try {
    const stored = await chrome.storage.sync.get('appUrl');
    input.value  = stored.appUrl ?? DEFAULT_APP_URL;
  } catch {
    input.value = DEFAULT_APP_URL;
  }

  // ── Save handler ──────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    const raw = input.value.trim();

    if (!raw) {
      showStatus('Please enter an app URL.', 'error');
      return;
    }

    // Minimal URL validation
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      showStatus('URL must start with http:// or https://', 'error');
      return;
    }

    try {
      new URL(raw);
    } catch {
      showStatus('Invalid URL — please check and try again.', 'error');
      return;
    }

    const appUrl = raw.replace(/\/$/, ''); // strip trailing slash

    try {
      await chrome.storage.sync.set({ appUrl });
      showStatus('✅ Settings saved!', 'success');
    } catch {
      showStatus('Could not save settings. Try again.', 'error');
    }
  });

  // Allow Enter key in the input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className   = `status ${type}`;
  setTimeout(() => { el.className = 'status'; }, 3000);
}

init();
