const appUrlInput    = document.getElementById('app-url');
const saveBtn        = document.getElementById('save-btn');
const errorMsg       = document.getElementById('error-msg');
const successBanner  = document.getElementById('success-banner');

// Load saved value
chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) appUrlInput.value = result.appUrl;
});

saveBtn.addEventListener('click', save);
appUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

function save() {
  const raw = appUrlInput.value.trim().replace(/\/$/, '');

  // Validate
  errorMsg.classList.add('hidden');
  appUrlInput.classList.remove('error');

  if (!raw) {
    showError('Please enter your TravelPanel URL.');
    return;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    showError('Please enter a valid URL starting with https://');
    return;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    showError('URL must start with https://');
    return;
  }

  const normalised = parsed.origin; // strip path, keep scheme+host+port

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  chrome.storage.sync.set({ appUrl: normalised }, () => {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
    successBanner.style.display = 'block';
    appUrlInput.value = normalised;
    setTimeout(() => { successBanner.style.display = 'none'; }, 4000);
  });
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  appUrlInput.classList.add('error');
  appUrlInput.focus();
}
