const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const statusMsg = document.getElementById('statusMsg');

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
}

function clearStatus() {
  statusMsg.className = 'status';
  statusMsg.textContent = '';
}

// Load saved settings
chrome.storage.sync.get(['appUrl'], (result) => {
  appUrlInput.value = result.appUrl || '';
  appUrlInput.placeholder = DEFAULT_APP_URL;
});

// Save settings
saveBtn.addEventListener('click', () => {
  const rawUrl = appUrlInput.value.trim();

  if (!rawUrl) {
    showStatus('Please enter your TravelPanel app URL.', 'error');
    return;
  }

  let normalizedUrl;
  try {
    normalizedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).origin;
  } catch {
    showStatus('That doesn\'t look like a valid URL. Example: https://your-app.vercel.app', 'error');
    return;
  }

  chrome.storage.sync.set({ appUrl: normalizedUrl, configured: true }, () => {
    appUrlInput.value = normalizedUrl;
    showStatus('✓ Settings saved successfully!', 'success');
    setTimeout(clearStatus, 3000);
  });
});

// Test connection
testBtn.addEventListener('click', async () => {
  const rawUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;
  let testUrl;

  try {
    testUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).origin;
  } catch {
    showStatus('Invalid URL — please check your app URL.', 'error');
    return;
  }

  testBtn.disabled = true;
  showStatus('Testing connection…', 'info');

  try {
    const res = await fetch(`${testUrl}/api/import`, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(5000),
    });
    // Any response (even 405) means the server is reachable
    showStatus(`✓ Connected to ${testUrl}`, 'success');
  } catch (err) {
    if (err.name === 'TimeoutError') {
      showStatus(`Connection timed out. Is ${testUrl} deployed?`, 'error');
    } else {
      showStatus(`Could not reach ${testUrl}. Check the URL and try again.`, 'error');
    }
  } finally {
    testBtn.disabled = false;
  }
});

// Save on Enter
appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
