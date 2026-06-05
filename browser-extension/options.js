'use strict';

const urlInput  = document.getElementById('app-url');
const saveBtn   = document.getElementById('save-btn');
const testBtn   = document.getElementById('test-btn');
const statusEl  = document.getElementById('save-status');
const macShortcut = document.getElementById('shortcut-mac');
const winShortcut = document.getElementById('shortcut-win');

// ─── Detect platform ─────────────────────────────────────────────────────────

if (navigator.platform.startsWith('Mac')) {
  macShortcut.style.display = 'inline-flex';
  winShortcut.style.display = 'none';
}

// ─── Version ─────────────────────────────────────────────────────────────────

const manifest = chrome.runtime.getManifest();
document.getElementById('ext-version').textContent = `v${manifest.version}`;

// ─── Load saved URL ──────────────────────────────────────────────────────────

chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
  if (appUrl) urlInput.value = appUrl;
});

// ─── Save ────────────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = `save-status show ${type}`;
  setTimeout(() => { statusEl.className = 'save-status'; }, 3000);
}

saveBtn.addEventListener('click', () => {
  const val = urlInput.value.trim();
  if (!val) {
    showStatus('Enter a URL', 'err');
    urlInput.focus();
    return;
  }
  try {
    new URL(val);
  } catch {
    showStatus('Invalid URL', 'err');
    urlInput.focus();
    return;
  }
  chrome.storage.sync.set({ appUrl: val.replace(/\/$/, '') }, () => {
    showStatus('Saved ✓', 'ok');
  });
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ─── Test connection ─────────────────────────────────────────────────────────

testBtn.addEventListener('click', async () => {
  const val = urlInput.value.trim().replace(/\/$/, '');
  if (!val) {
    showStatus('Enter a URL first', 'err');
    return;
  }
  testBtn.textContent = 'Testing…';
  testBtn.disabled    = true;
  try {
    const res = await fetch(val, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    if (res.ok || res.status < 500) {
      showStatus('Connected ✓', 'ok');
    } else {
      showStatus(`HTTP ${res.status}`, 'err');
    }
  } catch {
    showStatus('Could not reach URL', 'err');
  } finally {
    testBtn.textContent = 'Test connection';
    testBtn.disabled    = false;
  }
});
