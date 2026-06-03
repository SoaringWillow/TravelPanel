'use strict';

const inputEl   = document.getElementById('app-url');
const btnSave   = document.getElementById('btn-save');
const statusEl  = document.getElementById('status');

// ── Load saved URL ────────────────────────────────────────────────────────────

chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) inputEl.value = result.appUrl;
});

// ── Example fill buttons ──────────────────────────────────────────────────────

document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    inputEl.value = btn.dataset.url;
    inputEl.focus();
  });
});

// ── Save handler ──────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  setTimeout(() => { statusEl.className = 'status'; }, 3000);
}

btnSave.addEventListener('click', () => {
  const raw = inputEl.value.trim().replace(/\/$/, '');

  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  // Basic URL validation
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      showStatus('URL must start with http:// or https://', 'error');
      return;
    }
  } catch {
    showStatus('Invalid URL. Include the protocol (https://).', 'error');
    return;
  }

  btnSave.disabled = true;
  btnSave.textContent = 'Saving…';

  chrome.storage.sync.set({ appUrl: raw }, () => {
    btnSave.disabled = false;
    btnSave.textContent = 'Save Settings';
    showStatus('✓ Saved! The extension is ready to clip.', 'success');
  });
});

// Allow Enter key on input
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSave.click();
});
