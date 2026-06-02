'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

async function init() {
  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrlInput = document.getElementById('appUrl');
  appUrlInput.value = stored.appUrl || DEFAULT_APP_URL;

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appUrlInput.value = btn.dataset.url;
    });
  });

  // Save
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const url = appUrlInput.value.trim().replace(/\/$/, '');
    if (!url) return showStatus('Enter a URL', 'error');

    try {
      new URL(url);
    } catch {
      return showStatus('Invalid URL format', 'error');
    }

    await chrome.storage.sync.set({ appUrl: url });
    showStatus('Settings saved!', 'success');
  });

  // Test connection
  document.getElementById('testBtn').addEventListener('click', async () => {
    const url = appUrlInput.value.trim().replace(/\/$/, '');
    showStatus('Testing…', '');
    try {
      const res = await fetch(`${url}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 400 || res.status === 429) {
        showStatus('✓ TravelPanel is reachable', 'success');
      } else {
        showStatus(`Server responded with ${res.status}`, 'error');
      }
    } catch (err) {
      if (err.name === 'TimeoutError') {
        showStatus('Connection timed out — is TravelPanel running?', 'error');
      } else {
        showStatus('Could not reach TravelPanel at that URL', 'error');
      }
    }
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'status-msg ' + (type || '');
  if (type === 'success' || type === 'error') {
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  } else {
    el.style.display = msg ? 'block' : 'none';
  }
}

init().catch(console.error);
