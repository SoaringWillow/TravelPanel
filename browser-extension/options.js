'use strict';

const urlInput  = document.getElementById('urlInput');
const saveBtn   = document.getElementById('saveBtn');
const testBtn   = document.getElementById('testBtn');
const statusMsg = document.getElementById('statusMsg');
const clearLink = document.getElementById('clearLink');

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
}

function hideStatus() {
  statusMsg.className = 'status';
}

function normalizeUrl(raw) {
  const s = raw.trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

// Load saved URL on open
chrome.storage.sync.get({ travelPanelUrl: '' }, ({ travelPanelUrl }) => {
  urlInput.value = travelPanelUrl;
});

saveBtn.addEventListener('click', () => {
  const url = normalizeUrl(urlInput.value);

  if (!url) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    new URL(url);
  } catch {
    showStatus('That doesn\'t look like a valid URL. Try https://your-app.vercel.app', 'error');
    return;
  }

  saveBtn.disabled = true;
  chrome.storage.sync.set({ travelPanelUrl: url }, () => {
    urlInput.value = url;
    saveBtn.disabled = false;
    showStatus('✅ Saved! The extension is ready to use.', 'success');
  });
});

testBtn.addEventListener('click', async () => {
  const url = normalizeUrl(urlInput.value);

  if (!url) {
    showStatus('Save a URL first before testing.', 'error');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';
  hideStatus();

  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    if (res.ok || res.status === 405) {
      showStatus('✅ Connection successful! Your TravelPanel is reachable.', 'success');
    } else {
      showStatus(`⚠️ Got HTTP ${res.status}. The URL may be wrong or the app is down.`, 'error');
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      showStatus('⚠️ Connection timed out. Check the URL or your network.', 'error');
    } else {
      showStatus(`⚠️ Could not reach that URL. Make sure it's correct and the app is running.`, 'error');
    }
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test connection →';
  }
});

clearLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (!confirm('Reset all extension settings?')) return;
  chrome.storage.sync.clear(() => {
    urlInput.value = '';
    showStatus('Settings cleared.', 'info');
  });
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
