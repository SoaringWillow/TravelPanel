// TravelPanel Clipper — options page

const input   = document.getElementById('panelUrlInput');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const status  = document.getElementById('statusMsg');

// ── Load saved URL ────────────────────────────────────────────────────────────

chrome.storage.sync.get(['panelUrl'], ({ panelUrl = '' }) => {
  input.value = panelUrl;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function showStatus(type, msg) {
  status.className = `status visible ${type}`;
  status.textContent = type === 'success' ? `✓ ${msg}` : `✕ ${msg}`;
  setTimeout(() => { status.className = 'status'; }, 4000);
}

function normalizeUrl(raw) {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    showStatus('error', 'Please enter a URL');
    return;
  }
  input.value = url;
  chrome.storage.sync.set({ panelUrl: url }, () => {
    showStatus('success', 'Saved! You can close this tab.');
  });
});

// ── Test connection ───────────────────────────────────────────────────────────

testBtn.addEventListener('click', async () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    showStatus('error', 'Enter a URL first');
    return;
  }

  testBtn.textContent = 'Testing…';
  testBtn.disabled = true;

  try {
    const res = await fetch(`${url}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok || res.status === 400) {
      showStatus('success', 'Connected to TravelPanel');
    } else {
      showStatus('error', `Server returned ${res.status}`);
    }
  } catch {
    showStatus('error', 'Could not reach TravelPanel. Check the URL and try again.');
  } finally {
    testBtn.textContent = 'Test connection';
    testBtn.disabled = false;
  }
});

// Enter key saves
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
