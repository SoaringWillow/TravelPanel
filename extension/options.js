'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.app';

document.addEventListener('DOMContentLoaded', () => {
  const input   = document.getElementById('appUrl');
  const saveBtn = document.getElementById('saveBtn');
  const hint    = document.getElementById('hint');

  /* load saved URL */
  chrome.storage.sync.get(['appUrl'], r => {
    input.value = (r.appUrl || '').trim() || DEFAULT_APP_URL;
  });

  function setHint(msg, type) {
    hint.textContent = msg;
    hint.className = `field-hint ${type}`;
  }

  saveBtn.addEventListener('click', () => {
    const raw = input.value.trim();

    if (!raw) {
      setHint('Please enter a URL', 'error');
      return;
    }

    try {
      const url = new URL(raw);
      if (!['https:', 'http:'].includes(url.protocol)) {
        setHint('URL must start with https:// or http://', 'error');
        return;
      }
    } catch {
      setHint('Not a valid URL', 'error');
      return;
    }

    const clean = raw.replace(/\/$/, '');
    chrome.storage.sync.set({ appUrl: clean }, () => {
      setHint('Saved!', 'success');
      setTimeout(() => setHint('', ''), 2000);
    });
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
