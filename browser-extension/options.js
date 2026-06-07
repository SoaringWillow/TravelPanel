'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('panel-url');
  const saveBtn  = document.getElementById('save-btn');
  const toast    = document.getElementById('toast');

  // Load saved URL
  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');
  urlInput.value = travelPanelUrl;

  saveBtn.addEventListener('click', async () => {
    const raw = urlInput.value.trim();

    // Basic validation: must start with http:// or https://
    if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
      urlInput.style.borderColor = '#dc2626';
      urlInput.focus();
      return;
    }
    urlInput.style.borderColor = '';

    await chrome.storage.sync.set({ travelPanelUrl: raw.replace(/\/$/, '') });

    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
  });

  // Reset red border on input
  urlInput.addEventListener('input', () => {
    urlInput.style.borderColor = '';
  });
});
