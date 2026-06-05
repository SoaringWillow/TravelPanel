document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const statusEl    = document.getElementById('status');

  // Load stored setting
  chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
    appUrlInput.value = appUrl;
  });

  saveBtn.addEventListener('click', () => {
    const raw    = appUrlInput.value.trim();
    const appUrl = raw.replace(/\/$/, '');

    if (appUrl && !appUrl.startsWith('http')) {
      statusEl.style.color = '#dc2626';
      statusEl.textContent = '⚠️ URL must start with http:// or https://';
      return;
    }

    chrome.storage.sync.set({ appUrl }, () => {
      statusEl.style.color = '#059669';
      statusEl.textContent = '✅ Saved!';
      setTimeout(() => { statusEl.textContent = ''; }, 2500);
    });
  });

  // Save on Enter
  appUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
