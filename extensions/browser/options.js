'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const status = document.getElementById('save-status');

  // Load saved URL
  const { travelpanel_url: current } = await chrome.storage.sync.get('travelpanel_url');
  if (current) input.value = current;

  saveBtn.addEventListener('click', async () => {
    const raw = input.value.trim();

    if (!raw) {
      flash('Enter a URL first.', 'error');
      return;
    }

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      flash('Enter a valid URL (e.g. https://your-app.vercel.app)', 'error');
      return;
    }

    await chrome.storage.sync.set({ travelpanel_url: raw.replace(/\/$/, '') });
    flash('Saved!', 'success');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
  });

  function flash(msg, type) {
    status.textContent = msg;
    status.className = `save-status ${type}`;
    clearTimeout(flash._timer);
    flash._timer = setTimeout(() => {
      status.textContent = '';
      status.className = 'save-status';
    }, 2500);
  }
});
