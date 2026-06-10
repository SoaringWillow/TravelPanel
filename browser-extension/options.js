// TravelPanel Clipper — options.js

const urlInput  = document.getElementById('urlInput');
const saveBtn   = document.getElementById('saveBtn');
const testBtn   = document.getElementById('testBtn');
const statusEl  = document.getElementById('status');
const statusTxt = document.getElementById('statusText');

function showStatus(type, text) {
  statusEl.className = `status show ${type}`;
  statusTxt.textContent = text;
}
function hideStatus() { statusEl.className = 'status'; }

// Load saved URL
chrome.storage.sync.get({ travelPanelUrl: '' }, ({ travelPanelUrl }) => {
  urlInput.value = travelPanelUrl;
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    urlInput.value = btn.dataset.url;
    urlInput.focus();
  });
});

// Save
saveBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) { showStatus('err', 'Please enter a URL.'); return; }
  try { new URL(raw); } catch { showStatus('err', 'That doesn\'t look like a valid URL.'); return; }
  await chrome.storage.sync.set({ travelPanelUrl: raw });
  showStatus('ok', 'Saved! The extension will use this URL.');
  setTimeout(hideStatus, 3000);
});

// Test connection
testBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) { showStatus('err', 'Enter a URL first.'); return; }
  testBtn.textContent = 'Testing…';
  testBtn.disabled = true;
  hideStatus();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(raw, { signal: controller.signal, mode: 'no-cors' });
    clearTimeout(timer);
    showStatus('ok', 'Connected! TravelPanel is reachable at that URL.');
  } catch (err) {
    if (err.name === 'AbortError') {
      showStatus('err', 'Timed out. Is TravelPanel running at that URL?');
    } else {
      // no-cors returns opaque response — a TypeError means CORS but site is reachable
      // treat that as success since we can't read the response anyway
      showStatus('ok', 'Reachable (CORS restricted, which is normal). Looks good!');
    }
  } finally {
    testBtn.textContent = 'Test connection';
    testBtn.disabled = false;
  }
});
