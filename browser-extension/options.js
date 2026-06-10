document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('tpUrl');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  chrome.storage.sync.get(['travelPanelUrl'], (result) => {
    if (result.travelPanelUrl) {
      urlInput.value = result.travelPanelUrl;
    }
  });

  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim().replace(/\/$/, '');

    if (!url) {
      showStatus('error', 'Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      showStatus('error', 'Please enter a valid URL (e.g. https://your-app.vercel.app)');
      return;
    }

    chrome.storage.sync.set({ travelPanelUrl: url }, () => {
      showStatus('success', '✓ Settings saved! You can now clip pages to TravelPanel.');
    });
  });

  function showStatus(type, message) {
    status.className = `status ${type}`;
    status.textContent = message;
    if (type === 'success') {
      setTimeout(() => { status.style.display = 'none'; }, 3000);
    }
  }

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
