const elUrl      = document.getElementById('urlInput');
const elSaveBtn  = document.getElementById('saveBtn');
const elTestBtn  = document.getElementById('testBtn');
const elFeedback = document.getElementById('feedback');

function showFeedback(type, message) {
  elFeedback.className = `feedback ${type}`;
  elFeedback.textContent = message;
  if (type === 'success') {
    setTimeout(() => { elFeedback.className = 'feedback'; }, 3000);
  }
}

// Load saved URL on open
chrome.storage.sync.get(['travelPanelUrl']).then(({ travelPanelUrl }) => {
  if (travelPanelUrl) elUrl.value = travelPanelUrl;
});

elSaveBtn.addEventListener('click', async () => {
  const raw = elUrl.value.trim().replace(/\/$/, '');
  if (!raw) {
    showFeedback('error', 'Please enter a URL.');
    return;
  }
  try {
    new URL(raw); // validate
  } catch {
    showFeedback('error', 'Invalid URL format. Example: https://your-app.vercel.app');
    return;
  }
  await chrome.storage.sync.set({ travelPanelUrl: raw });
  showFeedback('success', '✓ Saved! The clipper is now connected.');
});

elTestBtn.addEventListener('click', async () => {
  const raw = elUrl.value.trim().replace(/\/$/, '');
  if (!raw) {
    showFeedback('error', 'Enter a URL first.');
    return;
  }

  elTestBtn.disabled = true;
  elTestBtn.textContent = 'Testing…';

  try {
    const res = await fetch(`${raw}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 400) {
      // 400 = API exists, URL was invalid — still connected
      showFeedback('success', `✓ Connected! TravelPanel is reachable at ${raw}`);
    } else {
      showFeedback('error', `API returned ${res.status}. Check the URL and try again.`);
    }
  } catch (e) {
    if (e.name === 'TimeoutError') {
      showFeedback('error', 'Connection timed out. Is the URL correct?');
    } else {
      showFeedback('error', `Could not reach ${raw}. Check the URL.`);
    }
  } finally {
    elTestBtn.disabled = false;
    elTestBtn.textContent = 'Test Connection';
  }
});
