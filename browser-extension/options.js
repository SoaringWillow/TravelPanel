'use strict';

const DEFAULT_APP_URL = 'https://your-travelpanel.vercel.app';

function showToast(id, durationMs = 2500) {
  const el = document.getElementById(id);
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), durationMs);
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('app-url');

  // Load saved URL
  chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
    input.value = appUrl;
  });

  // Detect Mac for shortcut display
  const isMac = navigator.platform.toLowerCase().includes('mac');
  document.getElementById('shortcut-mac').style.display = isMac ? '' : 'none';
  document.getElementById('shortcut-mac2').style.display = isMac ? '' : 'none';
  document.getElementById('shortcut-other').style.display = isMac ? 'none' : '';
  document.getElementById('shortcut-other2').style.display = isMac ? 'none' : '';

  // Version from manifest
  const { version } = chrome.runtime.getManifest();
  document.getElementById('version-row').textContent = `TravelPanel Clipper v${version}`;

  // Save
  document.getElementById('save-btn').addEventListener('click', () => {
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) return;
    chrome.storage.sync.set({ appUrl: url }, () => showToast('save-toast'));
  });

  // Test connection
  document.getElementById('test-btn').addEventListener('click', async () => {
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) return;

    try {
      // Lightweight ping: HEAD the root page
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status < 500) {
        showToast('test-toast');
      } else {
        showToast('error-toast', 4000);
      }
    } catch {
      showToast('error-toast', 4000);
    }
  });
});
