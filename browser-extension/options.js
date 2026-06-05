// TravelPanel Clipper — options page logic

const DEFAULT_SERVER = 'https://your-travelpanel-app.vercel.app';

const serverInput = document.getElementById('server-url');
const saveBtn = document.getElementById('save-btn');
const testBtn = document.getElementById('test-btn');
const saveStatus = document.getElementById('save-status');

// Load saved settings
async function loadSettings() {
  const stored = await chrome.storage.sync.get({ travelPanelUrl: '' });
  serverInput.value = stored.travelPanelUrl || '';
}

// Save settings
saveBtn.addEventListener('click', async () => {
  const raw = serverInput.value.trim();

  if (!raw) {
    showStatus('⚠️ Please enter a server URL.', '#dc2626');
    return;
  }

  // Normalize: strip trailing slash
  const url = raw.replace(/\/$/, '');

  try {
    new URL(url); // validate
  } catch {
    showStatus('⚠️ Invalid URL format.', '#dc2626');
    return;
  }

  await chrome.storage.sync.set({ travelPanelUrl: url });
  showStatus('✅ Settings saved!', '#16a34a');
});

// Test connection
testBtn.addEventListener('click', async () => {
  const raw = serverInput.value.trim().replace(/\/$/, '');
  if (!raw) {
    showStatus('⚠️ Enter a URL first.', '#dc2626');
    return;
  }

  showStatus('⏳ Testing connection…', '#64748b');
  testBtn.disabled = true;

  try {
    const res = await fetch(`${raw}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok || res.status === 400) {
      // 400 = API is reachable (bad input is still a response)
      showStatus('✅ Connected! TravelPanel API is reachable.', '#16a34a');
    } else {
      showStatus(`⚠️ Server responded with ${res.status}. Check the URL.`, '#dc2626');
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      showStatus('⚠️ Connection timed out. Is the server running?', '#dc2626');
    } else {
      showStatus(`⚠️ Could not connect: ${err.message}`, '#dc2626');
    }
  } finally {
    testBtn.disabled = false;
  }
});

function showStatus(msg, color) {
  saveStatus.textContent = msg;
  saveStatus.style.color = color;
  saveStatus.classList.remove('hidden');
  clearTimeout(saveStatus._timer);
  saveStatus._timer = setTimeout(() => {
    saveStatus.classList.add('hidden');
  }, 3500);
}

loadSettings();
