const DEFAULT_URL = 'https://travel-panel.vercel.app';

document.addEventListener('DOMContentLoaded', async () => {
  const form      = document.getElementById('settings-form');
  const urlInput  = document.getElementById('url-input');
  const statusEl  = document.getElementById('status');

  // Load saved URL
  try {
    const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');
    if (urlInput) urlInput.value = travelPanelUrl || DEFAULT_URL;
  } catch {
    if (urlInput) urlInput.value = DEFAULT_URL;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = (urlInput?.value || '').trim();

    if (!raw) {
      showStatus('error', 'Please enter a URL.');
      return;
    }

    // Basic URL validation
    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      showStatus('error', 'Enter a valid http:// or https:// URL.');
      return;
    }

    const normalized = raw.replace(/\/$/, ''); // strip trailing slash

    try {
      await chrome.storage.sync.set({ travelPanelUrl: normalized });
      showStatus('success', 'Settings saved.');
    } catch {
      showStatus('error', 'Failed to save settings.');
    }
  });

  function showStatus(type, msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    setTimeout(() => {
      if (statusEl) statusEl.className = 'status';
    }, 3000);
  }
});
