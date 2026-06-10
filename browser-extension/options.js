document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const testBtn = document.getElementById('test-btn');
  const statusEl = document.getElementById('status');

  // Load saved URL
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  urlInput.value = appUrl;

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }
  }

  // Normalize URL: strip trailing slash
  function normalizeUrl(url) {
    return url.trim().replace(/\/+$/, '');
  }

  // Save
  saveBtn.addEventListener('click', async () => {
    const raw = urlInput.value;
    if (!raw.trim()) {
      showStatus('Please enter your TravelPanel URL.', 'error');
      return;
    }
    try {
      new URL(raw.trim()); // validate
    } catch {
      showStatus('That doesn\'t look like a valid URL. Try https://your-app.vercel.app', 'error');
      return;
    }
    const url = normalizeUrl(raw);
    await chrome.storage.sync.set({ appUrl: url });
    showStatus('Saved!', 'success');
  });

  // Test connection
  testBtn.addEventListener('click', async () => {
    const raw = urlInput.value;
    if (!raw.trim()) {
      showStatus('Enter a URL first.', 'error');
      return;
    }
    const url = normalizeUrl(raw);
    testBtn.disabled = true;
    testBtn.textContent = 'Testing…';
    showStatus('', '');
    statusEl.style.display = 'none';
    try {
      const res = await fetch(`${url}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 400) {
        // 400 is fine — it means the API is reachable but url validation ran
        showStatus('✓ Connected to TravelPanel!', 'success');
      } else {
        showStatus(`Server responded with ${res.status}. Check the URL.`, 'error');
      }
    } catch {
      showStatus('Could not reach TravelPanel. Check the URL or your network.', 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test connection';
    }
  });

  // Enter to save
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
