'use strict';

const DEFAULT_APP_URL = 'https://your-travelpanel-app.vercel.app';

const $id = (id) => document.getElementById(id);

async function load() {
  // Load saved URL
  chrome.storage.sync.get(['appUrl'], (result) => {
    $id('appUrl').value = result.appUrl || '';
  });

  // Load session stats
  chrome.storage.local.get(['sessionClips'], (result) => {
    $id('statClips').textContent = result.sessionClips || 0;
  });

  // Extension version from manifest
  const manifest = chrome.runtime.getManifest();
  $id('statVersion').textContent = manifest.version;
}

function showStatus(message, type) {
  const el = $id('status');
  el.textContent = message;
  el.className = `status ${type}`;
  setTimeout(() => { el.className = 'status'; }, 3000);
}

$id('saveBtn').addEventListener('click', () => {
  const url = $id('appUrl').value.trim().replace(/\/$/, '');
  if (!url) {
    showStatus('Please enter your TravelPanel URL.', 'error');
    return;
  }
  try {
    new URL(url); // validate
  } catch {
    showStatus('That doesn\'t look like a valid URL.', 'error');
    return;
  }
  chrome.storage.sync.set({ appUrl: url }, () => {
    showStatus('Settings saved!', 'success');
  });
});

$id('testBtn').addEventListener('click', async () => {
  const url = $id('appUrl').value.trim().replace(/\/$/, '') || DEFAULT_APP_URL;
  $id('testBtn').textContent = 'Testing…';
  $id('testBtn').disabled = true;

  try {
    const response = await fetch(`${url}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Extension': 'travelpanel-clipper' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok || response.status === 400) {
      showStatus(`Connected! TravelPanel is reachable at ${url}`, 'success');
    } else {
      showStatus(`Server responded with ${response.status}. Check the URL.`, 'error');
    }
  } catch (err) {
    showStatus(`Could not connect: ${err.message.slice(0, 80)}`, 'error');
  } finally {
    $id('testBtn').textContent = 'Test Connection';
    $id('testBtn').disabled = false;
  }
});

load();
