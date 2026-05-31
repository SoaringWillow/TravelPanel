'use strict';

const input = document.getElementById('app-url');
const btnSave = document.getElementById('btn-save');
const btnTest = document.getElementById('btn-test');
const toast = document.getElementById('toast');

function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

function normalizeUrl(raw) {
  const s = raw.trim().replace(/\/$/, '');
  if (!s) return '';
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    return 'https://' + s;
  }
  return s;
}

// Load saved URL on open
chrome.storage.sync.get(['appUrl'], (result) => {
  if (result.appUrl) input.value = result.appUrl;
});

btnSave.addEventListener('click', () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    showToast('Please enter a URL.', 'error');
    return;
  }
  try {
    new URL(url);
  } catch {
    showToast('Invalid URL — please check and try again.', 'error');
    return;
  }
  input.value = url;
  chrome.storage.sync.set({ appUrl: url }, () => {
    showToast('✓ Saved! You can now clip pages to TravelPanel.', 'success');
  });
});

btnTest.addEventListener('click', async () => {
  const url = normalizeUrl(input.value);
  if (!url) {
    showToast('Enter a URL first.', 'error');
    return;
  }
  btnTest.textContent = 'Testing…';
  btnTest.disabled = true;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (res.ok || res.status < 500) {
      showToast('✓ Connected! TravelPanel is reachable.', 'success');
    } else {
      showToast(`Server returned ${res.status}. Check the URL.`, 'error');
    }
  } catch {
    showToast('Could not reach the app. Check the URL and try again.', 'error');
  } finally {
    btnTest.textContent = 'Test Connection';
    btnTest.disabled = false;
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSave.click();
});
