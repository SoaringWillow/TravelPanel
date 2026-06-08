'use strict';

const input   = document.getElementById('url-input');
const saveBtn = document.getElementById('save-btn');
const testBtn = document.getElementById('test-btn');
const status  = document.getElementById('status');

function showStatus(msg, type) {
  status.textContent = msg;
  status.className   = type;
}

function normalizeUrl(raw) {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

// Load saved URL on open
chrome.storage.sync.get('travelpanelUrl').then(({ travelpanelUrl }) => {
  if (travelpanelUrl) input.value = travelpanelUrl;
});

saveBtn.addEventListener('click', async () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    input.classList.add('error');
    showStatus('Please enter a valid URL (http:// or https://).', 'error');
    return;
  }
  input.classList.remove('error');
  await chrome.storage.sync.set({ travelpanelUrl: url });
  showStatus('✓ Saved! The extension will now use ' + url, 'success');
});

testBtn.addEventListener('click', async () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    input.classList.add('error');
    showStatus('Please enter a valid URL first.', 'error');
    return;
  }
  input.classList.remove('error');
  showStatus('Testing connection…', '');
  testBtn.disabled = true;

  try {
    const res = await fetch(`${url}/api/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      showStatus('✓ Connected to TravelPanel at ' + url, 'success');
    } else {
      // A 404 is fine — the app is up, /api/health just may not exist yet
      showStatus('✓ Server is reachable at ' + url, 'success');
    }
  } catch {
    showStatus('✗ Could not reach ' + url + '. Check the URL and try again.', 'error');
  } finally {
    testBtn.disabled = false;
  }
});

input.addEventListener('input', () => {
  input.classList.remove('error');
  status.className = '';
  status.textContent = '';
});
