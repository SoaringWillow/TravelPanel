'use strict';

const DEFAULT_TP_URL = 'http://localhost:3000';

const input  = document.getElementById('tp-url');
const toast  = document.getElementById('toast');

// Load saved value
chrome.storage.sync.get({ travelpanelUrl: DEFAULT_TP_URL }, ({ travelpanelUrl }) => {
  input.value = travelpanelUrl;
});

// Save
document.getElementById('btn-save').addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '') || DEFAULT_TP_URL;
  input.value = url;
  chrome.storage.sync.set({ travelpanelUrl: url }, () => {
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  });
});

// Reset
document.getElementById('btn-reset').addEventListener('click', () => {
  input.value = DEFAULT_TP_URL;
  chrome.storage.sync.set({ travelpanelUrl: DEFAULT_TP_URL });
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
});

// Preset buttons
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => { input.value = btn.dataset.url; });
});
