'use strict';

const input  = document.getElementById('urlInput');
const btn    = document.getElementById('saveBtn');
const status = document.getElementById('status');

chrome.storage.sync.get(['travelPanelUrl'], (result) => {
  input.value = result.travelPanelUrl || 'http://localhost:3000';
});

btn.addEventListener('click', () => {
  const raw = input.value.trim().replace(/\/$/, '');
  if (!raw) { input.focus(); return; }

  chrome.storage.sync.set({ travelPanelUrl: raw }, () => {
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2500);
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btn.click();
});
