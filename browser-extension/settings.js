/* TravelPanel Clipper — settings.js */

const urlInput  = document.getElementById('app-url');
const saveBtn   = document.getElementById('save-btn');
const testBtn   = document.getElementById('test-btn');
const saveToast = document.getElementById('save-toast');
const testToast = document.getElementById('test-toast');

// ── Load saved settings ────────────────────────────────────────────────────

chrome.storage.local.get(['appUrl'], ({ appUrl }) => {
  if (appUrl) urlInput.value = appUrl;
});

// ── Validate URL on input ──────────────────────────────────────────────────

urlInput.addEventListener('input', () => {
  const val = urlInput.value.trim();
  if (!val) {
    urlInput.className = '';
    return;
  }
  try {
    const u = new URL(val);
    const valid = u.protocol === 'http:' || u.protocol === 'https:';
    urlInput.className = valid ? 'valid' : 'invalid';
  } catch {
    urlInput.className = 'invalid';
  }
});

// ── Save ───────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) return;

  try {
    new URL(raw); // validate
  } catch {
    urlInput.className = 'invalid';
    urlInput.focus();
    return;
  }

  chrome.storage.local.set({ appUrl: raw }, () => {
    saveToast.classList.add('visible');
    setTimeout(() => saveToast.classList.remove('visible'), 3000);
  });
});

// ── Test connection ────────────────────────────────────────────────────────

testBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim().replace(/\/$/, '');
  if (!raw) {
    urlInput.focus();
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';
  testToast.style.display = 'none';
  testToast.classList.remove('visible');

  try {
    const res = await fetch(`${raw}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok || res.status === 400) {
      // 400 means the API is live (invalid URL error from our code)
      testToast.textContent = '✅ Connection successful! TravelPanel is reachable.';
      testToast.style.background = '#f0fdf4';
      testToast.style.borderColor = '#86efac';
      testToast.style.color = '#15803d';
    } else {
      testToast.textContent = `⚠️ Reachable but returned status ${res.status}. Check the URL.`;
      testToast.style.background = '#fef9c3';
      testToast.style.borderColor = '#fde047';
      testToast.style.color = '#713f12';
    }
  } catch (err) {
    testToast.textContent = `❌ Could not connect. Check the URL and ensure the app is running.`;
    testToast.style.background = '#fef2f2';
    testToast.style.borderColor = '#fca5a5';
    testToast.style.color = '#991b1b';
  }

  testToast.style.display = 'flex';
  testBtn.disabled = false;
  testBtn.textContent = 'Test connection';
});
