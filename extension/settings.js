const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// Load saved URL
chrome.storage.sync.get(['appUrl'], (result) => {
  appUrlInput.value = result.appUrl || '';
  appUrlInput.placeholder = DEFAULT_APP_URL;
});

saveBtn.addEventListener('click', () => {
  const raw = appUrlInput.value.trim();
  const url = raw || DEFAULT_APP_URL;

  // Validate URL format
  try {
    new URL(url);
  } catch {
    appUrlInput.style.borderColor = '#ef4444';
    appUrlInput.focus();
    return;
  }

  appUrlInput.style.borderColor = '';

  chrome.storage.sync.set({ appUrl: raw || null }, () => {
    statusEl.classList.add('visible');
    setTimeout(() => statusEl.classList.remove('visible'), 2000);
  });
});
