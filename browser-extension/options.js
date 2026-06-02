const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const urlInput = document.getElementById('app-url');
const saveBtn = document.getElementById('save-btn');
const savedMsg = document.getElementById('saved-msg');
const urlError = document.getElementById('url-error');

// Load saved settings
chrome.storage.sync.get(['appUrl'], result => {
  urlInput.value = result.appUrl || DEFAULT_APP_URL;
});

// Open Chrome shortcuts page
document.getElementById('shortcuts-link').addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  let v = value.trim().replace(/\/$/, '');
  if (!v.startsWith('http')) v = 'https://' + v;
  return v;
}

saveBtn.addEventListener('click', () => {
  const raw = urlInput.value;
  const normalized = normalizeUrl(raw);

  if (!isValidUrl(normalized)) {
    urlInput.classList.add('error');
    urlError.classList.remove('hidden');
    return;
  }

  urlInput.classList.remove('error');
  urlError.classList.add('hidden');
  urlInput.value = normalized;

  chrome.storage.sync.set({ appUrl: normalized }, () => {
    savedMsg.classList.remove('hidden');
    setTimeout(() => savedMsg.classList.add('hidden'), 2500);
  });
});

urlInput.addEventListener('input', () => {
  urlInput.classList.remove('error');
  urlError.classList.add('hidden');
});
