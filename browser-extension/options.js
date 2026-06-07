'use strict';

const input  = document.getElementById('tpUrl');
const btn    = document.getElementById('saveBtn');
const status = document.getElementById('status');

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  setTimeout(() => { status.className = 'status hidden'; }, 2800);
}

async function load() {
  try {
    const data = await chrome.storage.sync.get('travelPanelUrl');
    if (data.travelPanelUrl) input.value = data.travelPanelUrl;
  } catch {}
}

btn.addEventListener('click', async () => {
  const raw = input.value.trim();
  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    // Normalise: strip trailing slash
    const normalised = raw.replace(/\/$/, '');
    await chrome.storage.sync.set({ travelPanelUrl: normalised });
    showStatus('Saved!', 'success');
  } catch {
    showStatus('Please enter a valid http:// or https:// URL.', 'error');
  }
});

input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

load();
