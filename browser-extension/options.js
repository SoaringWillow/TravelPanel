'use strict';

const urlInput = document.getElementById('urlInput');
const saveBtn  = document.getElementById('saveBtn');
const testBtn  = document.getElementById('testBtn');
const status   = document.getElementById('status');

// ─── Load saved URL on open ──────────────────────────────────────────────────

chrome.storage.sync.get('travelPanelUrl', ({ travelPanelUrl }) => {
  if (travelPanelUrl) urlInput.value = travelPanelUrl;
});

// ─── Save ────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    showStatus('Invalid URL — make sure it starts with https:// or http://', 'error');
    return;
  }

  const cleanUrl = parsed.origin;

  chrome.storage.sync.set({ travelPanelUrl: cleanUrl }, () => {
    showStatus('✅ Saved! You can now clip travel inspiration from any page.', 'success');
  });
});

// ─── Test ────────────────────────────────────────────────────────────────────

testBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) {
    showStatus('Enter a URL first, then click Test.', 'error');
    return;
  }
  chrome.tabs.create({ url: raw });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  setTimeout(() => { status.className = 'status'; }, 4000);
}
