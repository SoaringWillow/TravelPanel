'use strict';

const input    = document.getElementById('url-input');
const saveBtn  = document.getElementById('save-btn');
const feedback = document.getElementById('feedback');

let feedbackTimer = null;

function showFeedback(msg, type) {
  clearTimeout(feedbackTimer);
  feedback.textContent = msg;
  feedback.className = `feedback ${type}`;
  feedbackTimer = setTimeout(() => {
    feedback.textContent = '';
    feedback.className = 'feedback';
  }, 3000);
}

async function loadSaved() {
  const result = await chrome.storage.sync.get(['travelPanelUrl']);
  if (result.travelPanelUrl) {
    input.value = result.travelPanelUrl;
  }
}

async function save() {
  let url = input.value.trim().replace(/\/$/, '');

  if (!url) {
    showFeedback('Please enter a URL.', 'error');
    return;
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
  } catch {
    showFeedback('Enter a valid URL starting with http:// or https://', 'error');
    return;
  }

  await chrome.storage.sync.set({ travelPanelUrl: url });
  showFeedback('✓ Settings saved!', 'success');
}

saveBtn.addEventListener('click', save);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') save();
});

loadSaved();
