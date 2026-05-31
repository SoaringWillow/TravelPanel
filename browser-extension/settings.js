'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

const urlInput = document.getElementById('url-input');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMsg = document.getElementById('status-msg');

async function load() {
  const stored = await chrome.storage.sync.get('travelPanelUrl');
  urlInput.value = stored.travelPanelUrl || DEFAULT_URL;
  saveBtn.disabled = true;
}

urlInput.addEventListener('input', () => {
  const val = urlInput.value.trim();
  const valid = val.startsWith('http://') || val.startsWith('https://');
  saveBtn.disabled = !valid;
  statusMsg.classList.remove('visible', 'error');
});

saveBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim().replace(/\/$/, '');
  await chrome.storage.sync.set({ travelPanelUrl: url });
  saveBtn.disabled = true;
  statusMsg.textContent = 'Saved!';
  statusMsg.classList.remove('error');
  statusMsg.classList.add('visible');
  setTimeout(() => statusMsg.classList.remove('visible'), 2000);
});

resetBtn.addEventListener('click', async () => {
  urlInput.value = DEFAULT_URL;
  await chrome.storage.sync.set({ travelPanelUrl: DEFAULT_URL });
  saveBtn.disabled = true;
  statusMsg.textContent = 'Reset to default.';
  statusMsg.classList.remove('error');
  statusMsg.classList.add('visible');
  setTimeout(() => statusMsg.classList.remove('visible'), 2000);
});

load();
