/* TravelPanel Clipper — Options Script */

const STORAGE_KEY = 'travelPanelUrl';

const urlInput  = document.getElementById('tpUrl');
const saveBtn   = document.getElementById('saveBtn');
const testBtn   = document.getElementById('testBtn');
const statusEl  = document.getElementById('status');
const hintEl    = document.getElementById('urlHint');

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost');
  } catch {
    return false;
  }
}

function showStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
  if (type === 'success') {
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }
}

function validateInput() {
  const val = urlInput.value.trim();
  if (!val) {
    urlInput.className = '';
    hintEl.textContent = 'Must start with https:// or http://localhost';
    return false;
  }
  if (isValidUrl(val)) {
    urlInput.className = 'valid';
    hintEl.textContent = '✓ Valid URL';
    return true;
  } else {
    urlInput.className = 'invalid';
    hintEl.textContent = '✗ Enter a valid URL (https://...)';
    return false;
  }
}

// ── Load saved value ──────────────────────────────────────────────────────────

chrome.storage.sync.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) {
    urlInput.value = result[STORAGE_KEY];
    validateInput();
  }
});

// ── Live validation ───────────────────────────────────────────────────────────

urlInput.addEventListener('input', validateInput);

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const val = urlInput.value.trim();
  if (!validateInput()) {
    showStatus('error', 'Please enter a valid URL before saving.');
    return;
  }

  const normalized = val.endsWith('/') ? val.slice(0, -1) : val;

  chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, () => {
    if (chrome.runtime.lastError) {
      showStatus('error', `Failed to save: ${chrome.runtime.lastError.message}`);
    } else {
      showStatus('success', '✓ Settings saved! The extension will use this URL for all clips.');
    }
  });
});

// ── Test ──────────────────────────────────────────────────────────────────────

testBtn.addEventListener('click', () => {
  const val = urlInput.value.trim();
  if (!validateInput()) {
    showStatus('error', 'Enter a valid URL first.');
    return;
  }
  // Open the app root to verify it loads
  chrome.tabs.create({ url: val });
});
