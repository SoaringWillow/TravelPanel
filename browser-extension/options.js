'use strict';

const urlInput  = document.getElementById('urlInput');
const saveBtn   = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');

function showStatus(type, text) {
  statusMsg.className = `status show ${type}`;
  statusMsg.textContent = text;
  if (type === 'success') {
    setTimeout(() => { statusMsg.className = 'status'; }, 3000);
  }
}

// Load stored URL on open
chrome.storage.sync.get(['travelpanelUrl'], (result) => {
  if (result.travelpanelUrl) {
    urlInput.value = result.travelpanelUrl;
  }
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    urlInput.value = btn.dataset.url;
    urlInput.focus();
  });
});

// Save
saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim();
  if (!raw) {
    showStatus('error', 'Please enter a URL.');
    return;
  }

  let normalized;
  try {
    const parsed = new URL(raw);
    normalized = parsed.origin; // strip trailing path
  } catch {
    showStatus('error', 'Invalid URL — include http:// or https://');
    return;
  }

  chrome.storage.sync.set({ travelpanelUrl: normalized }, () => {
    if (chrome.runtime.lastError) {
      showStatus('error', 'Failed to save: ' + chrome.runtime.lastError.message);
    } else {
      urlInput.value = normalized;
      showStatus('success', '✓ Settings saved');
    }
  });
});

// Save on Enter
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
