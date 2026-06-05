const STORAGE_KEY_URL = 'travelpanel_url';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('app-url');
  const btn = document.getElementById('btn-save');
  const msg = document.getElementById('saved-msg');

  // Load saved URL
  chrome.storage.sync.get([STORAGE_KEY_URL], result => {
    if (result[STORAGE_KEY_URL]) input.value = result[STORAGE_KEY_URL];
  });

  btn.addEventListener('click', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });

  function save() {
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) { input.focus(); return; }
    chrome.storage.sync.set({ [STORAGE_KEY_URL]: url }, () => {
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 2000);
    });
  }
});
