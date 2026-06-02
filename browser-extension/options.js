'use strict';

function $(id) { return document.getElementById(id); }

function showStatus(type, message) {
  const el = $('status');
  el.className = `status ${type}`;
  el.textContent = message;
  if (type === 'success') setTimeout(() => el.classList.add('hidden'), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  // Load saved URL
  chrome.storage.sync.get(['appUrl'], result => {
    if (result.appUrl) $('appUrl').value = result.appUrl;
  });

  // Save
  $('saveBtn').addEventListener('click', () => {
    const raw = $('appUrl').value.trim().replace(/\/$/, '');

    if (!raw) {
      showStatus('error', 'Please enter your TravelPanel URL.');
      return;
    }

    try { new URL(raw); } catch {
      showStatus('error', 'That doesn\'t look like a valid URL (include https://).');
      return;
    }

    chrome.storage.sync.set({ appUrl: raw }, () => {
      showStatus('success', 'Settings saved!');
    });
  });

  // Enter key
  $('appUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('saveBtn').click();
  });

  // Test connection
  $('testBtn').addEventListener('click', async () => {
    const raw = $('appUrl').value.trim().replace(/\/$/, '');
    if (!raw) { showStatus('error', 'Enter a URL first.'); return; }

    $('testBtn').disabled = true;
    $('testBtn').textContent = 'Testing…';

    try {
      const res = await fetch(`${raw}/api/health`, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
      if (res.ok || res.status === 404) {
        // 404 means the server is reachable (no /api/health route yet is fine)
        showStatus('success', `Connected to ${new URL(raw).hostname} ✓`);
      } else {
        showStatus('error', `Server responded with ${res.status}. Check the URL.`);
      }
    } catch {
      // Try a plain fetch to the root as fallback
      try {
        await fetch(raw, { method: 'HEAD', signal: AbortSignal.timeout(6000), mode: 'no-cors' });
        showStatus('success', `Reached ${new URL(raw).hostname} ✓`);
      } catch {
        showStatus('error', 'Could not reach the server. Check your URL and connection.');
      }
    } finally {
      $('testBtn').disabled = false;
      $('testBtn').textContent = 'Test connection';
    }
  });
});
