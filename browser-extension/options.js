const urlInput = document.getElementById('urlInput');
const saveBtn  = document.getElementById('saveBtn');
const toast    = document.getElementById('toast');

function showToast(type, msg) {
  toast.className = `toast ${type}`;
  toast.textContent = type === 'success' ? `✓ ${msg}` : `✗ ${msg}`;
  toast.style.display = 'flex';
  setTimeout(() => { toast.style.display = 'none'; }, 2800);
}

function isValidUrl(val) {
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Load saved URL on open
chrome.storage.sync.get({ travelpanelUrl: '' }, ({ travelpanelUrl }) => {
  if (travelpanelUrl) urlInput.value = travelpanelUrl;
});

// Show Mac-specific modifier key
if (navigator.platform.startsWith('Mac')) {
  document.getElementById('modKey').textContent = '⌘';
}

// Save on button click
saveBtn.addEventListener('click', () => {
  const val = urlInput.value.trim().replace(/\/$/, '');

  if (!val) {
    showToast('error', 'Please enter your TravelPanel URL');
    return;
  }
  if (!isValidUrl(val)) {
    showToast('error', 'Enter a valid URL (e.g. https://your-app.vercel.app)');
    return;
  }

  chrome.storage.sync.set({ travelpanelUrl: val }, () => {
    showToast('success', 'Settings saved');
  });
});

// Save on Enter key
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
