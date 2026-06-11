'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  setTimeout(() => { el.className = 'status-msg'; }, 3500);
}

async function save() {
  let url = document.getElementById('appUrl').value.trim();
  if (!url) url = DEFAULT_APP_URL;

  // Normalize: remove trailing slash
  url = url.replace(/\/$/, '');

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    showStatus('Invalid URL — must start with https:// or http://', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Failed to save: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('Settings saved ✓', 'success');
    }
  });
}

async function testConnection() {
  const url = document.getElementById('appUrl').value.trim() || DEFAULT_APP_URL;
  const btn = document.getElementById('testBtn');

  btn.textContent = 'Testing…';
  btn.disabled = true;

  try {
    const res = await fetch(url.replace(/\/$/, '') + '/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok || res.status === 400 || res.status === 422) {
      showStatus('Connection successful ✓ TravelPanel is reachable', 'success');
    } else {
      showStatus(`Server responded with status ${res.status}`, 'error');
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      showStatus('Connection timed out — check the URL and try again', 'error');
    } else {
      showStatus(`Could not reach TravelPanel: ${err.message}`, 'error');
    }
  } finally {
    btn.textContent = 'Test Connection';
    btn.disabled = false;
  }
}

function init() {
  // Load saved URL
  chrome.storage.sync.get(['appUrl'], result => {
    document.getElementById('appUrl').value = result.appUrl || '';
  });

  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('testBtn').addEventListener('click', testConnection);

  // Save on Enter
  document.getElementById('appUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
  });
}

document.addEventListener('DOMContentLoaded', init);
