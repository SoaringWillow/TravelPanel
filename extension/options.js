'use strict';

const input = document.getElementById('url-input');
const saveBtn = document.getElementById('save-btn');
const feedbackEl = document.getElementById('feedback');

// Load saved URL on open
chrome.storage.sync.get(['travelpanelUrl'], ({ travelpanelUrl }) => {
  if (travelpanelUrl) {
    input.value = travelpanelUrl;
  }
});

saveBtn.addEventListener('click', saveUrl);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveUrl();
});

function saveUrl() {
  const raw = input.value.trim();

  if (!raw) {
    showFeedback('error', 'Please enter your TravelPanel URL.');
    input.classList.add('error');
    return;
  }

  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    showFeedback('error', 'Please enter a valid URL (e.g. https://your-app.vercel.app).');
    input.classList.add('error');
    return;
  }

  const normalized = url.origin; // strips trailing slash / path
  input.value = normalized;
  input.classList.remove('error');

  chrome.storage.sync.set({ travelpanelUrl: normalized }, () => {
    showFeedback('success', 'Saved! You can now clip pages to TravelPanel.');
  });
}

function showFeedback(type, message) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;

  clearTimeout(feedbackEl._timer);
  if (type === 'success') {
    feedbackEl._timer = setTimeout(() => {
      feedbackEl.className = 'feedback';
    }, 3000);
  }
}
