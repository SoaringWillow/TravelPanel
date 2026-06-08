function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  if (msg) setTimeout(() => { el.textContent = ''; el.className = 'status'; }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  const input   = document.getElementById('appUrl');
  const saveBtn = document.getElementById('saveBtn');

  chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
    input.value = appUrl;
  });

  saveBtn.addEventListener('click', () => {
    const url = input.value.trim().replace(/\/$/, '');

    if (!url) {
      showStatus('Please enter your TravelPanel URL.', 'error');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      showStatus('URL must start with https:// or http://', 'error');
      return;
    }

    chrome.storage.sync.set({ appUrl: url }, () => {
      showStatus('Settings saved!', 'success');
    });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
