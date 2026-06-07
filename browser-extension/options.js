const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const savedMsg    = document.getElementById('savedMsg');
  const resetBtn    = document.getElementById('resetBtn');

  // Load saved value
  chrome.storage.sync.get(['appUrl'], result => {
    appUrlInput.value = result.appUrl || '';
  });

  saveBtn.addEventListener('click', () => {
    const url = appUrlInput.value.trim();
    chrome.storage.sync.set({ appUrl: url }, () => {
      savedMsg.classList.add('visible');
      setTimeout(() => savedMsg.classList.remove('visible'), 2000);
    });
  });

  resetBtn.addEventListener('click', () => {
    appUrlInput.value = '';
    chrome.storage.sync.remove('appUrl', () => {
      savedMsg.textContent = '✓ Reset to default';
      savedMsg.classList.add('visible');
      setTimeout(() => {
        savedMsg.textContent = '✓ Saved';
        savedMsg.classList.remove('visible');
      }, 2000);
    });
  });

  // Save on Enter
  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
