const input = document.getElementById('tp-url');
const btnSave = document.getElementById('btn-save');
const errorEl = document.getElementById('url-error');
const statusEl = document.getElementById('save-status');

// Load saved URL on open
chrome.storage.local.get(['travelpanelUrl'], (res) => {
  if (res.travelpanelUrl) input.value = res.travelpanelUrl;
});

btnSave.addEventListener('click', () => {
  const raw = input.value.trim();

  errorEl.textContent = '';
  errorEl.classList.add('hidden');
  statusEl.classList.add('hidden');

  if (!raw) {
    showError('Please enter your TravelPanel URL.');
    return;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    showError('That doesn\'t look like a valid URL. Include https://');
    return;
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    showError('URL must start with https:// (or http:// for local dev).');
    return;
  }

  const clean = parsed.origin; // strip path/query/hash
  chrome.storage.local.set({ travelpanelUrl: clean }, () => {
    input.value = clean;
    statusEl.classList.remove('hidden');
    setTimeout(() => statusEl.classList.add('hidden'), 3000);
  });
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSave.click();
});
