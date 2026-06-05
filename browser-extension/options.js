async function init() {
  const urlInput = document.getElementById('travelPanelUrl');
  const saveBtn  = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load saved URL
  chrome.storage.sync.get({ travelPanelUrl: '' }, ({ travelPanelUrl }) => {
    urlInput.value = travelPanelUrl;
  });

  saveBtn.addEventListener('click', () => {
    const raw = urlInput.value.trim();

    if (raw && !/^https?:\/\//i.test(raw)) {
      statusEl.textContent = 'URL must start with https://';
      statusEl.className = 'status status-error';
      return;
    }

    // Normalise: strip trailing slash
    const url = raw.replace(/\/$/, '');

    chrome.storage.sync.set({ travelPanelUrl: url }, () => {
      statusEl.textContent = '✓ Saved';
      statusEl.className = 'status status-success';
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 2500);
    });
  });

  // Save on Enter key
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
}

init();
