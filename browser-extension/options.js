async function init() {
  // Load saved URL
  const stored = await chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' });
  const urlInput = document.getElementById('urlInput');
  urlInput.value = stored.travelPanelUrl;

  // Keyboard shortcut hint
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  document.getElementById('kbdShortcut').textContent = isMac ? '⌘⇧T' : 'Alt+T';

  // ── Save ───────────────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const raw = urlInput.value.trim().replace(/\/$/, '');
    if (!raw) {
      showStatus('Please enter a URL', 'error');
      return;
    }

    try {
      new URL(raw); // validate
    } catch {
      showStatus('Invalid URL — include the protocol (http:// or https://)', 'error');
      return;
    }

    await chrome.storage.sync.set({ travelPanelUrl: raw });
    showStatus('✓ Settings saved', 'success');
  });

  // ── Test connection ────────────────────────────────────────────────────────
  document.getElementById('testBtn').addEventListener('click', async () => {
    const raw = urlInput.value.trim().replace(/\/$/, '');
    if (!raw) {
      showStatus('Enter a URL first', 'error');
      return;
    }

    showStatus('Testing connection…', 'success');

    try {
      const res = await fetch(`${raw}/api/import`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok || res.status === 405) {
        showStatus('✓ TravelPanel is reachable', 'success');
      } else {
        showStatus(`Server responded with ${res.status}`, 'error');
      }
    } catch {
      showStatus('Could not reach TravelPanel — check the URL and your network', 'error');
    }
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', init);
