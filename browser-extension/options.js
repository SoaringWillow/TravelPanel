const appUrlInput = document.getElementById('app-url');
const saveBtn     = document.getElementById('save-btn');
const statusEl    = document.getElementById('status');

// Load saved settings on open
chrome.storage.sync.get({ appUrl: '' }, (items) => {
  appUrlInput.value = items.appUrl || '';
});

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className   = `status${isError ? ' error' : ''}`;
  setTimeout(() => { statusEl.className = 'status hidden'; }, 2500);
}

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim();

  if (url && !url.match(/^https?:\/\//)) {
    showStatus('Please enter a valid URL starting with https://', true);
    return;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    showStatus('✓ Settings saved!');
  });
});

// Save on Enter
appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
