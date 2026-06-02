document.addEventListener('DOMContentLoaded', async () => {
  const input   = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const status  = document.getElementById('status');

  // Load saved value
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  input.value = appUrl;

  saveBtn.addEventListener('click', async () => {
    const raw = input.value.trim().replace(/\/$/, '');

    if (!raw) {
      status.textContent = 'Please enter a URL.';
      status.className = 'status err';
      return;
    }

    try {
      new URL(raw); // validate
    } catch {
      status.textContent = 'Invalid URL — include https://';
      status.className = 'status err';
      return;
    }

    await chrome.storage.sync.set({ appUrl: raw });
    input.value = raw;
    status.textContent = '✓ Saved!';
    status.className = 'status ok';
    setTimeout(() => { status.textContent = ''; }, 2500);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
