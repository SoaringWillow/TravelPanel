/* global chrome */
'use strict';

const DEFAULT_URL = 'http://localhost:3000';

async function init() {
  const { travelPanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelPanelUrl');

  const input   = document.getElementById('app-url');
  const form    = document.getElementById('settings-form');
  const savedEl = document.getElementById('saved-msg');

  input.value = travelPanelUrl;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) return;

    await chrome.storage.sync.set({ travelPanelUrl: url });

    savedEl.classList.add('visible');
    setTimeout(() => savedEl.classList.remove('visible'), 2500);
  });
}

init().catch(console.error);
