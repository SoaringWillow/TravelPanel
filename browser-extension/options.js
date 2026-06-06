'use strict';

const urlInput  = document.getElementById('app-url');
const saveBtn   = document.getElementById('save-btn');
const feedback  = document.getElementById('feedback');

async function load() {
  const stored = await chrome.storage.sync.get(['appUrl']);
  if (stored.appUrl) urlInput.value = stored.appUrl;
}

function showFeedback(msg, isError = false) {
  feedback.textContent = msg;
  feedback.classList.remove('hidden', 'error');
  if (isError) feedback.classList.add('error');
  setTimeout(() => feedback.classList.add('hidden'), 3000);
}

saveBtn.addEventListener('click', async () => {
  let url = urlInput.value.trim().replace(/\/$/, '');

  if (!url) {
    showFeedback('Please enter a URL.', true);
    return;
  }

  if (!/^https?:\/\//.test(url)) {
    url = 'https://' + url;
    urlInput.value = url;
  }

  try {
    new URL(url); // validate
  } catch {
    showFeedback('That doesn\'t look like a valid URL.', true);
    return;
  }

  await chrome.storage.sync.set({ appUrl: url });
  showFeedback('✓ Saved!');
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

load();
