document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');
  const versionEl = document.getElementById('ext-version');

  // Load current settings
  const data = await chrome.storage.sync.get('appUrl');
  if (data.appUrl) urlInput.value = data.appUrl;

  // Show extension version
  const manifest = chrome.runtime.getManifest();
  versionEl.textContent = `v${manifest.version}`;

  // Save handler
  saveBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim().replace(/\/$/, '');
    if (!url) return;

    await chrome.storage.sync.set({ appUrl: url });

    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 2000);
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
