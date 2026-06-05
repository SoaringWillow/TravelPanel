'use strict';

const appUrlInput = document.getElementById('app-url');
const saveBtn     = document.getElementById('save-btn');
const feedback    = document.getElementById('feedback');

// Load saved URL on open
chrome.storage.sync.get('appUrl').then(({ appUrl }) => {
  if (appUrl) appUrlInput.value = appUrl;
});

saveBtn.addEventListener('click', async () => {
  let value = appUrlInput.value.trim().replace(/\/$/, '');

  if (!value) {
    showFeedback('Please enter a URL.', true);
    return;
  }

  // Validate URL format
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    value = parsed.origin; // normalize to origin only
  } catch {
    showFeedback('Please enter a valid URL (e.g. https://your-app.vercel.app).', true);
    return;
  }

  await chrome.storage.sync.set({ appUrl: value });
  appUrlInput.value = value;
  showFeedback('✓ Saved!', false);
});

function showFeedback(msg, isError) {
  feedback.textContent = msg;
  feedback.className = `feedback${isError ? ' error' : ''}`;
  if (!isError) setTimeout(() => { feedback.textContent = ''; }, 2500);
}
