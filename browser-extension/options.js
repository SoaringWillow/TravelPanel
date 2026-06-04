const urlInput = document.getElementById('tp-url');
const saveBtn  = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// Load saved URL on open
chrome.storage.sync.get(['travelPanelUrl'], (result) => {
  if (result.travelPanelUrl) urlInput.value = result.travelPanelUrl;
});

saveBtn.addEventListener('click', () => {
  const value = urlInput.value.trim().replace(/\/$/, '');

  if (!value) {
    showStatus('Please enter a URL.', true);
    return;
  }

  try {
    new URL(value);
  } catch {
    showStatus('Invalid URL — include https://', true);
    return;
  }

  chrome.storage.sync.set({ travelPanelUrl: value }, () => {
    showStatus('✓ Saved!', false);
  });
});

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = 'status show' + (isError ? ' error' : '');
  setTimeout(() => { statusEl.className = 'status'; }, 2500);
}
