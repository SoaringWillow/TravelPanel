'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const urlInput  = document.getElementById('travelpanel-url');
  const saveBtn   = document.getElementById('save-btn');
  const testBtn   = document.getElementById('test-btn');
  const saveMsg   = document.getElementById('save-msg');
  const testMsg   = document.getElementById('test-msg');

  // ── Load saved value ───────────────────────────────────────────────────────

  const stored = await chrome.storage.sync.get('travelpanelUrl');
  if (stored.travelpanelUrl) {
    urlInput.value = stored.travelpanelUrl;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `status-msg ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  function normalise(raw) {
    return raw.trim().replace(/\/+$/, '');
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  saveBtn.addEventListener('click', async () => {
    const url = normalise(urlInput.value);

    if (!url) {
      showMsg(saveMsg, '⚠️ Please enter your TravelPanel URL.', 'error');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showMsg(saveMsg, '⚠️ URL must start with http:// or https://', 'error');
      return;
    }

    await chrome.storage.sync.set({ travelpanelUrl: url });
    urlInput.value = url;
    showMsg(saveMsg, '✅ Saved!', 'success');
  });

  // ── Test connection ────────────────────────────────────────────────────────

  testBtn.addEventListener('click', async () => {
    const url = normalise(urlInput.value);

    if (!url) {
      showMsg(testMsg, '⚠️ Enter a URL first.', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing…';

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok || res.status < 500) {
        showMsg(testMsg, '✅ Connection successful!', 'success');
      } else {
        showMsg(testMsg, `⚠️ Server responded with ${res.status}. Check the URL.`, 'error');
      }
    } catch {
      showMsg(testMsg, '❌ Could not reach that URL. Check it and try again.', 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test connection';
    }
  });

  // ── Save on Enter ──────────────────────────────────────────────────────────

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
