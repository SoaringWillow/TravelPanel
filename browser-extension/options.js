const urlInput  = document.getElementById('travelPanelUrl');
const saveBtn   = document.getElementById('saveBtn');
const resetBtn  = document.getElementById('resetBtn');
const statusEl  = document.getElementById('status');

// ─── Load saved value on open ─────────────────────────────────────────────────

chrome.storage.sync.get('travelPanelUrl', ({ travelPanelUrl }) => {
  if (travelPanelUrl) urlInput.value = travelPanelUrl;
});

// ─── Save ─────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim();

  if (!raw) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  // Basic validation: must look like an https URL
  let url;
  try {
    url = new URL(raw);
  } catch {
    showStatus('Enter a valid URL (e.g. https://travelpanel.vercel.app)', 'error');
    return;
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    showStatus('URL must start with https:// or http://', 'error');
    return;
  }

  const normalized = url.origin; // strip trailing path/slash

  chrome.storage.sync.set({ travelPanelUrl: normalized }, () => {
    showStatus('✓ Saved!', 'success');
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

resetBtn.addEventListener('click', () => {
  chrome.storage.sync.remove('travelPanelUrl', () => {
    urlInput.value = '';
    showStatus('Cleared.', 'success');
  });
});

// ─── Enter key shortcut ───────────────────────────────────────────────────────

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ─── Status helper ────────────────────────────────────────────────────────────

let hideTimer;
function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type;
  clearTimeout(hideTimer);
  if (type === 'success') {
    hideTimer = setTimeout(() => { statusEl.textContent = ''; }, 2500);
  }
}
