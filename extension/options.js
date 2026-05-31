'use strict';

const input = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const status = document.getElementById('status');

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  if (type === 'success') setTimeout(() => { status.className = 'status'; }, 3000);
}

// Load saved URL on open
chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
  input.value = appUrl || '';
});

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '');
  if (!url) {
    showStatus('Please enter a URL.', 'error');
    return;
  }
  chrome.storage.sync.set({ appUrl: url }, () => {
    showStatus('Saved!', 'success');
  });
});

testBtn.addEventListener('click', async () => {
  const url = input.value.trim().replace(/\/$/, '') || 'http://localhost:3000';
  testBtn.textContent = 'Testing…';
  testBtn.disabled = true;
  try {
    const res = await fetch(`${url}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    if (res.ok) {
      showStatus(`Connected! TravelPanel is running at ${url}`, 'success');
    } else {
      showStatus(`Server responded with ${res.status}. Check the URL.`, 'error');
    }
  } catch {
    showStatus(`Could not connect to ${url}. Make sure TravelPanel is running.`, 'error');
  } finally {
    testBtn.textContent = 'Test connection';
    testBtn.disabled = false;
  }
});
