'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const urlInput    = document.getElementById('panel-url');
  const saveBtn     = document.getElementById('save-btn');
  const saveStatus  = document.getElementById('save-status');
  const clearBtn    = document.getElementById('clear-btn');
  const savedCount  = document.getElementById('saved-count');

  // ── Load current settings ──────────────────────────────────────────────
  chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL }, (settings) => {
    urlInput.value = settings.travelPanelUrl;
  });

  chrome.storage.local.get({ savedUrls: [] }, (data) => {
    savedCount.textContent = `${data.savedUrls.length} saved`;
  });

  // ── Save settings ──────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim() || DEFAULT_URL;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      urlInput.focus();
      urlInput.style.borderColor = '#ef4444';
      return;
    }

    urlInput.style.borderColor = '';
    chrome.storage.sync.set({ travelPanelUrl: url }, () => {
      saveStatus.style.display = 'inline';
      saveStatus.textContent = '✓ Saved';
      setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
    });
  });

  // ── Clear saved URL history ────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ savedUrls: [] }, () => {
      savedCount.textContent = '0 saved';
    });
  });

  // ── Enter key on URL input ─────────────────────────────────────────────
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
