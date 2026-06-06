// TravelPanel Clipper — options.js

document.addEventListener('DOMContentLoaded', async () => {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  const input = document.getElementById('app-url');
  input.value = appUrl;

  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');

  saveBtn.addEventListener('click', async () => {
    const url = input.value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ appUrl: url });
    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 2500);
  });

  // Allow Enter key to save
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
