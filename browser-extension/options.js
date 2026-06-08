const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const resetBtn    = document.getElementById('resetBtn');
const savedMsg    = document.getElementById('savedMsg');

chrome.storage.sync.get(['appUrl'], (result) => {
  appUrlInput.value = result.appUrl || DEFAULT_APP_URL;
});

saveBtn.addEventListener('click', () => {
  const url = appUrlInput.value.trim().replace(/\/$/, '');
  if (!url) return;
  chrome.storage.sync.set({ appUrl: url }, () => {
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 2500);
  });
});

resetBtn.addEventListener('click', () => {
  appUrlInput.value = DEFAULT_APP_URL;
  chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
});
