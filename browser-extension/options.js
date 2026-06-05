'use strict';

const urlInput  = document.getElementById('panel-url');
const saveBtn   = document.getElementById('save-btn');
const statusEl  = document.getElementById('status');

// ── Load saved URL on open ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const { panelUrl } = await chrome.storage.sync.get(['panelUrl']);
  if (panelUrl) urlInput.value = panelUrl;
});

// ── Save handler ────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim();

  if (!raw) {
    showStatus('error', 'Please enter your TravelPanel URL.');
    return;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    showStatus('error', 'That doesn\'t look like a valid URL. Example: https://your-app.vercel.app');
    return;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    showStatus('error', 'URL must start with http:// or https://');
    return;
  }

  const cleanUrl = parsed.origin; // strip trailing path/slash

  await chrome.storage.sync.set({ panelUrl: cleanUrl });

  urlInput.value = cleanUrl;
  showStatus('success', '✅ Saved! You can now clip pages from the extension popup.');
});

// ── Also save on Enter ──────────────────────────────────────────────────────

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ── Status helper ───────────────────────────────────────────────────────────

function showStatus(type, msg) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
}
