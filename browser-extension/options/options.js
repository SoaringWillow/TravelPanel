document.addEventListener('DOMContentLoaded', async () => {
  const urlInput    = document.getElementById('app-url');
  const saveBtn     = document.getElementById('save-btn');
  const errorMsg    = document.getElementById('error-msg');
  const successToast = document.getElementById('success-toast');

  // ── Load saved URL ──
  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');
  if (travelpanelUrl) urlInput.value = travelpanelUrl;

  // ── Validate on input ──
  urlInput.addEventListener('input', () => {
    errorMsg.style.display = 'none';
    urlInput.classList.remove('error');
    successToast.classList.remove('visible');
  });

  // ── Save ──
  saveBtn.addEventListener('click', async () => {
    const raw = urlInput.value.trim();

    if (!raw) {
      showError('URL is required.');
      return;
    }

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      showError('Please enter a valid URL (must start with https:// or http://)');
      return;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      showError('URL must start with https:// or http://');
      return;
    }

    const normalized = raw.replace(/\/$/, '');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    await chrome.storage.sync.set({ travelpanelUrl: normalized });

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
    successToast.classList.add('visible');

    setTimeout(() => successToast.classList.remove('visible'), 4000);
  });

  // ── Enter key shortcut ──
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    urlInput.classList.add('error');
    urlInput.focus();
  }
});
