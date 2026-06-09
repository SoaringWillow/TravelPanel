'use strict';

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

async function init() {
  // Load saved URL
  const { appUrl = '' } = await chrome.storage.sync.get('appUrl');
  document.getElementById('app-url').value = appUrl;

  // Keyboard shortcut display
  document.getElementById('shortcut-popup').textContent = isMac ? '⌘⇧S' : 'Ctrl+Shift+S';
  document.getElementById('shortcut-clip').textContent  = isMac ? '⌘⇧C' : 'Ctrl+Shift+C';

  // chrome://extensions/shortcuts link
  document.getElementById('shortcuts-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Version
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version-row').textContent =
    `TravelPanel Clipper v${manifest.version}`;

  // Save button
  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('app-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });

  // Test button
  document.getElementById('test-btn').addEventListener('click', testConnection);
}

async function save() {
  const input = document.getElementById('app-url');
  let url = input.value.trim();

  if (!url) {
    showStatus('Enter your TravelPanel URL first.', 'error');
    return;
  }

  // Normalize: ensure scheme
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    input.value = url;
  }

  // Strip trailing slash
  url = url.replace(/\/$/, '');

  await chrome.storage.sync.set({ appUrl: url });
  showStatus('✓ Saved!', 'success');

  // Auto-clear after 2s
  setTimeout(() => { document.getElementById('status-msg').style.display = 'none'; }, 2000);
}

async function testConnection() {
  const url = document.getElementById('app-url').value.trim().replace(/\/$/, '');
  if (!url) {
    showStatus('Enter a URL to test.', 'error');
    return;
  }

  showStatus('Testing connection…', 'testing');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok || res.status === 405) {
      showStatus('✓ Connection successful!', 'success');
    } else {
      showStatus(`⚠ Server responded with ${res.status}. Check the URL.`, 'error');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      showStatus('✗ Connection timed out. Check the URL.', 'error');
    } else {
      showStatus('✗ Could not connect. Make sure the URL is correct and the app is running.', 'error');
    }
  }
}

function showStatus(message, type) {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = `status ${type}`;
}

init().catch(console.error);
