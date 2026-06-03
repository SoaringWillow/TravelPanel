const urlInput  = document.getElementById('url-input');
const saveBtn   = document.getElementById('save-btn');
const testBtn   = document.getElementById('test-btn');
const statusMsg = document.getElementById('status-msg');

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
}

function clearStatus() {
  statusMsg.className = 'status-msg';
}

// Load saved value on open
chrome.storage.sync.get('travelpanelUrl').then(({ travelpanelUrl }) => {
  if (travelpanelUrl) urlInput.value = travelpanelUrl;
});

saveBtn.addEventListener('click', async () => {
  let val = urlInput.value.trim().replace(/\/$/, '');
  if (!val) {
    showStatus('Please enter a URL.', 'error');
    return;
  }
  if (!/^https?:\/\//.test(val)) {
    val = 'https://' + val;
    urlInput.value = val;
  }
  await chrome.storage.sync.set({ travelpanelUrl: val });
  showStatus('Saved! The clipper will use this URL.', 'success');
  setTimeout(clearStatus, 3000);
});

testBtn.addEventListener('click', async () => {
  let val = urlInput.value.trim().replace(/\/$/, '');
  if (!val) {
    showStatus('Enter a URL first.', 'error');
    return;
  }
  if (!/^https?:\/\//.test(val)) val = 'https://' + val;

  showStatus('Testing connection…', 'info');
  testBtn.disabled = true;

  try {
    const res = await fetch(val, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    if (res.ok || res.status < 500) {
      showStatus(`Connected! (HTTP ${res.status}) — URL looks good.`, 'success');
    } else {
      showStatus(`Server responded with HTTP ${res.status}. Check the URL.`, 'error');
    }
  } catch {
    showStatus('Could not reach the URL. Check it is correct and reachable.', 'error');
  } finally {
    testBtn.disabled = false;
  }
});

// Allow Enter key to save
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
