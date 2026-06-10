'use strict';

const DEFAULT_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('save-status');

  // Load saved value
  const { travelPanelUrl } = await new Promise((resolve) =>
    chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL }, resolve)
  );
  input.value = travelPanelUrl;

  saveBtn.addEventListener('click', async () => {
    const url = input.value.trim();
    if (!url) {
      statusEl.textContent = 'Please enter a URL.';
      statusEl.style.color = '#dc2626';
      return;
    }

    try {
      new URL(url); // validate
    } catch {
      statusEl.textContent = 'Invalid URL format.';
      statusEl.style.color = '#dc2626';
      return;
    }

    await new Promise((resolve) =>
      chrome.storage.sync.set({ travelPanelUrl: url }, resolve)
    );

    statusEl.textContent = 'Saved!';
    statusEl.style.color = '#059669';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  });

  // Save on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
});
