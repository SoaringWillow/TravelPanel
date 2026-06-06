/* global chrome */
'use strict';

(async () => {
  const urlInput   = document.getElementById('app-url');
  const saveBtn    = document.getElementById('save-btn');
  const testBtn    = document.getElementById('test-btn');
  const toast      = document.getElementById('toast');
  const statClips  = document.getElementById('stat-clips');

  // ── Load stored values ───────────────────────────────────────────────────────
  const { travelpanelUrl, clipCount = 0 } = await chrome.storage.sync.get([
    'travelpanelUrl',
    'clipCount',
  ]);

  if (travelpanelUrl) urlInput.value = travelpanelUrl;
  statClips.textContent = clipCount;

  // ── Show toast ───────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    toast.textContent  = msg;
    toast.className    = `toast ${type}`;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    const raw = urlInput.value.trim().replace(/\/$/, '');

    if (!raw) {
      showToast('Please enter a TravelPanel URL.', 'error');
      return;
    }

    try {
      new URL(raw);
    } catch {
      showToast('That doesn\'t look like a valid URL. Include https://.', 'error');
      return;
    }

    await chrome.storage.sync.set({ travelpanelUrl: raw });
    showToast('✓ Settings saved!', 'success');
  });

  // ── Test connection ───────────────────────────────────────────────────────────
  testBtn.addEventListener('click', async () => {
    const raw = urlInput.value.trim().replace(/\/$/, '');

    if (!raw) {
      showToast('Enter a URL first.', 'error');
      return;
    }

    testBtn.disabled    = true;
    testBtn.textContent = 'Testing…';

    try {
      const res = await fetch(raw, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok || res.status === 308 || res.status === 301 || res.status === 302) {
        showToast('✓ Connected! TravelPanel is reachable.', 'success');
      } else {
        showToast(`Received HTTP ${res.status}. Check the URL.`, 'error');
      }
    } catch {
      showToast('Could not reach TravelPanel. Check the URL and your internet.', 'error');
    } finally {
      testBtn.disabled    = false;
      testBtn.textContent = 'Test connection';
    }
  });

  // Enter key saves
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
})();
