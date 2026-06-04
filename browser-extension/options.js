const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = `✓ ${msg}`;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}

async function load() {
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
    document.getElementById('appUrl').value = data.appUrl || DEFAULT_APP_URL;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const appUrl = document.getElementById('appUrl').value.trim().replace(/\/$/, '');
    if (!appUrl) {
      document.getElementById('appUrl').setCustomValidity('Please enter a URL');
      document.getElementById('appUrl').reportValidity();
      return;
    }
    chrome.storage.sync.set({ appUrl }, () => {
      showToast('Settings saved');
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('appUrl').value = btn.dataset.url;
    });
  });
}

document.addEventListener('DOMContentLoaded', load);
