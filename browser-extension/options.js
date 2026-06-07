document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('url-input');
  const saveBtn  = document.getElementById('save-btn');
  const status   = document.getElementById('status');

  // Load saved URL
  const stored = await chrome.storage.sync.get('travelPanelUrl');
  if (stored.travelPanelUrl) {
    urlInput.value = stored.travelPanelUrl;
  }

  saveBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim().replace(/\/$/, '');

    if (!url) {
      showStatus('Please enter your TravelPanel URL.', 'error');
      return;
    }

    try {
      new URL(url); // Validate URL format
    } catch {
      showStatus('Please enter a valid URL (e.g. https://your-app.vercel.app)', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ travelPanelUrl: url, boards: [] });
      showStatus('✓ Settings saved! You can close this tab.', 'success');
    } catch (err) {
      showStatus('Failed to save: ' + err.message, 'error');
    }
  });

  // Save on Enter
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });

  function showStatus(msg, type) {
    status.textContent    = msg;
    status.className      = `status ${type}`;
    status.style.display  = 'block';
    if (type === 'success') {
      setTimeout(() => { status.style.display = 'none'; }, 4000);
    }
  }
});
