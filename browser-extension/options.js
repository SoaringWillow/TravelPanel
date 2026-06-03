const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const savedMsg = document.getElementById('savedMsg');
const shortcutLink = document.getElementById('shortcutLink');

// Customize shortcuts link only works if opened in a full tab
shortcutLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (items) => {
  appUrlInput.value = items.appUrl;
});

function showSaved() {
  savedMsg.classList.add('show');
  setTimeout(() => savedMsg.classList.remove('show'), 2000);
}

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '') || DEFAULT_APP_URL;
  appUrlInput.value = url;
  chrome.storage.sync.set({ appUrl: url }, showSaved);
});

resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL }, showSaved);
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
