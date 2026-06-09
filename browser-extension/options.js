// TravelPanel Browser Extension — Options page

const inputAppUrl = document.getElementById('input-app-url');
const btnSave = document.getElementById('btn-save');
const statusMsg = document.getElementById('status-msg');

// Load saved settings
chrome.storage.local.get(['appUrl'], (stored) => {
  if (stored.appUrl) inputAppUrl.value = stored.appUrl;
});

// Preset buttons
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    inputAppUrl.value = btn.dataset.url;
  });
});

// Save
btnSave.addEventListener('click', async () => {
  const raw = inputAppUrl.value.trim().replace(/\/$/, '');
  if (!raw) {
    showStatus('Please enter your TravelPanel URL.', 'error');
    return;
  }
  try {
    new URL(raw);
  } catch {
    showStatus('Please enter a valid URL (e.g. https://your-app.vercel.app)', 'error');
    return;
  }

  await chrome.storage.local.set({ appUrl: raw });
  showStatus('Settings saved!', 'success');
});

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
  setTimeout(() => {
    statusMsg.className = 'status hidden';
  }, 2500);
}
