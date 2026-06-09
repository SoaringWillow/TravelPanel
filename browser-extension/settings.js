// settings.js — TravelPanel Clipper settings page

const STORAGE_KEY = 'travelpanel_url';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const testBtn     = document.getElementById('testBtn');
const statusEl    = document.getElementById('status');

// ── Load existing value ───────────────────────────────────────────────────────

chrome.storage.sync.get(STORAGE_KEY, (stored) => {
  appUrlInput.value = stored[STORAGE_KEY] || '';
});

// ── Status helpers ────────────────────────────────────────────────────────────

function showStatus(msg, type, duration = 0) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  if (duration > 0) {
    setTimeout(() => { statusEl.className = 'status'; }, duration);
  }
}

function clearStatus() {
  statusEl.className = 'status';
}

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  const raw = appUrlInput.value.trim();
  const url = raw.replace(/\/$/, '');

  if (!url) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    new URL(url);
  } catch {
    showStatus('Please enter a valid URL (e.g. https://your-app.vercel.app).', 'error');
    return;
  }

  await chrome.storage.sync.set({ [STORAGE_KEY]: url });
  showStatus('✓ Saved! The extension is now connected to TravelPanel.', 'success', 4000);
});

// ── Test connection ───────────────────────────────────────────────────────────

testBtn.addEventListener('click', async () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '');

  if (!url) {
    showStatus('Enter a URL to test.', 'error');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';
  showStatus('Connecting to TravelPanel…', 'info');

  try {
    const res = await fetch(`${url}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(12000),
    });

    // 200 OK or 400 (missing key) both mean the API endpoint is reachable
    if (res.status === 200 || res.status === 400) {
      showStatus('✓ Connected to TravelPanel successfully!', 'success', 5000);
    } else {
      showStatus(
        `Connection returned HTTP ${res.status}. Check your URL is correct.`,
        'error',
      );
    }
  } catch (err) {
    showStatus(
      `Cannot reach ${url}. Make sure TravelPanel is deployed and the URL is correct.`,
      'error',
    );
  }

  testBtn.disabled = false;
  testBtn.textContent = 'Test connection';
});

// ── Save on Enter ─────────────────────────────────────────────────────────────

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

appUrlInput.addEventListener('input', clearStatus);
