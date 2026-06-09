document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');

  chrome.storage.sync.get({ appUrl: 'https://travelpanel.app' }, ({ appUrl }) => {
    urlInput.value = appUrl;
  });

  function save() {
    const appUrl = urlInput.value.trim() || 'https://travelpanel.app';
    chrome.storage.sync.set({ appUrl }, () => {
      statusEl.classList.add('visible');
      setTimeout(() => statusEl.classList.remove('visible'), 2000);
    });
  }

  saveBtn.addEventListener('click', save);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
});
