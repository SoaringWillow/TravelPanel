'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const input    = document.getElementById('app-url');
const saveBtn  = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const status   = document.getElementById('status');

function showStatus(msg, type = 'success') {
  status.textContent = msg;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 2500);
}

async function load() {
  const stored = await chrome.storage.local.get('appUrl');
  input.value = stored.appUrl || DEFAULT_APP_URL;
}

saveBtn.addEventListener('click', async () => {
  const raw = input.value.trim();
  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    const parsed = new URL(raw);
    const clean = parsed.origin; // strip trailing path
    await chrome.storage.local.set({ appUrl: clean });
    input.value = clean;
    showStatus('✓ Settings saved');
  } catch {
    showStatus('Invalid URL — include https://', 'error');
  }
});

resetBtn.addEventListener('click', async () => {
  await chrome.storage.local.set({ appUrl: DEFAULT_APP_URL });
  input.value = DEFAULT_APP_URL;
  showStatus('✓ Reset to default');
});

load();
