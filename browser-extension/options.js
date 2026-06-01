'use strict';

const urlInput = document.getElementById('urlInput');
const saveBtn  = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');

// ── Load saved value ──────────────────────────────────────────────────────

chrome.storage.sync.get('travelpanelUrl', ({ travelpanelUrl }) => {
  if (travelpanelUrl) {
    urlInput.value = travelpanelUrl;
  }
});

// ── Quick-fill chips ──────────────────────────────────────────────────────

document.querySelectorAll('.example-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    urlInput.value = chip.dataset.url;
    urlInput.focus();
  });
});

// ── Save ──────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', save);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

function save() {
  const raw = urlInput.value.trim();

  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  // Normalize: ensure it has a protocol
  let url = raw;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    urlInput.value = url;
  }

  // Remove trailing slash
  url = url.replace(/\/$/, '');

  saveBtn.disabled = true;
  chrome.storage.sync.set({ travelpanelUrl: url }, () => {
    saveBtn.disabled = false;
    showStatus('✓ Saved!', 'success');
    setTimeout(() => { statusMsg.textContent = ''; }, 2500);
  });
}

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
}
