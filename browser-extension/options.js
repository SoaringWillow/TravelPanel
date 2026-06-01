'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent  = msg;
  el.className    = `status ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');

  // ── Detect platform for keyboard shortcut display ──────────────────────
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  document.getElementById('modKey').textContent = isMac ? '⌘ Cmd' : 'Alt';

  // ── Load saved settings ────────────────────────────────────────────────
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, data => {
    appUrlInput.value = data.appUrl || DEFAULT_APP_URL;
  });

  // ── Preset chips ───────────────────────────────────────────────────────
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      appUrlInput.value = chip.dataset.url;
      appUrlInput.focus();
    });
  });

  // ── Save ───────────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', () => {
    let url = appUrlInput.value.trim().replace(/\/$/, '');

    if (!url) {
      showStatus('Please enter your TravelPanel URL.', 'error');
      return;
    }

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      appUrlInput.value = url;
    }

    try {
      new URL(url); // Validate
    } catch (_) {
      showStatus('Invalid URL — please check the format.', 'error');
      return;
    }

    chrome.storage.sync.set({ appUrl: url }, () => {
      showStatus('Settings saved!', 'success');
    });
  });

  // Save on Enter
  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('saveBtn').click();
  });
});
