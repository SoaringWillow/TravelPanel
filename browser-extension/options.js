// options.js — TravelPanel Clipper settings page

document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn     = document.getElementById('saveBtn');
  const statusOk    = document.getElementById('statusSuccess');
  const statusErr   = document.getElementById('statusError');

  // ── Load saved settings ──────────────────────────────────────────────────
  chrome.storage.sync.get(['appUrl'], result => {
    if (result.appUrl) {
      appUrlInput.value = result.appUrl;
    }
  });

  // ── Save handler ─────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const raw = appUrlInput.value.trim().replace(/\/$/, '');

    if (!raw) {
      showStatus(statusErr, 2500);
      return;
    }

    // Basic URL validation
    try {
      new URL(raw);
    } catch {
      showStatus(statusErr, 2500);
      return;
    }

    chrome.storage.sync.set({ appUrl: raw }, () => {
      showStatus(statusOk, 2000);
    });
  });

  // Allow saving with Enter key
  appUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });

  function showStatus(el, duration) {
    // Hide both first
    statusOk.style.display = 'none';
    statusErr.style.display = 'none';

    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, duration);
  }
});
