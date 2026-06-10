'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

function $(id) { return document.getElementById(id); }

async function load() {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
  $('urlInput').value = travelpanelUrl;
}

function showFeedback(msg, type) {
  const el = $('feedback');
  el.textContent = msg;
  el.className = `feedback ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

$('saveBtn').addEventListener('click', async () => {
  const raw = $('urlInput').value.trim().replace(/\/$/, '');
  try {
    new URL(raw); // validate
    await chrome.storage.sync.set({ travelpanelUrl: raw });
    showFeedback('Settings saved!', 'success');
  } catch {
    showFeedback('Please enter a valid URL (e.g. https://your-app.vercel.app)', 'error');
  }
});

$('resetBtn').addEventListener('click', async () => {
  $('urlInput').value = DEFAULT_URL;
  await chrome.storage.sync.set({ travelpanelUrl: DEFAULT_URL });
  showFeedback('Reset to default URL', 'success');
});

load();
