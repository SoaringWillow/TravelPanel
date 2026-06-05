/* TravelPanel Clipper — Options Page */

const DEFAULT_URL = 'http://localhost:3000';

async function init() {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
  document.getElementById('url-input').value = travelpanelUrl;

  // Show platform-appropriate shortcut hint
  const isMac = navigator.platform.toLowerCase().includes('mac');
  if (isMac) {
    document.getElementById('shortcut-mac').classList.remove('hidden');
    document.getElementById('shortcut-other').classList.add('hidden');
  }
}

async function testConnection() {
  const url = document.getElementById('url-input').value.trim();
  if (!url) return;

  const testBtn = document.getElementById('test-btn');
  const resultEl = document.getElementById('test-result');

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';
  resultEl.classList.add('hidden');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${url.replace(/\/$/, '')}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.ok || response.status === 429) {
      resultEl.textContent = '✓ Connected successfully — TravelPanel is reachable.';
      resultEl.className = 'test-result success';
    } else {
      resultEl.textContent = `⚠ Server responded with status ${response.status}. Check the URL.`;
      resultEl.className = 'test-result warning';
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      resultEl.textContent = '✗ Connection timed out. Is TravelPanel running?';
    } else {
      resultEl.textContent = `✗ Could not connect. Is TravelPanel running at this URL?`;
    }
    resultEl.className = 'test-result error';
  }

  resultEl.classList.remove('hidden');
  testBtn.disabled = false;
  testBtn.textContent = 'Test';
}

async function saveSettings() {
  const url = document.getElementById('url-input').value.trim();
  if (!url) return;

  await chrome.storage.sync.set({ travelpanelUrl: url });

  const statusEl = document.getElementById('save-status');
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 2500);
}

document.getElementById('test-btn').addEventListener('click', testConnection);
document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveSettings();
});

init();
