'use strict';

chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' }, data => {
  document.getElementById('urlInput').value = data.travelPanelUrl || '';
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const raw = document.getElementById('urlInput').value.trim();
  const url = raw.replace(/\/$/, '') || 'http://localhost:3000';

  chrome.storage.sync.set({ travelPanelUrl: url }, () => {
    const msg = document.getElementById('savedMsg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2200);
  });
});

// Allow Enter key to save
document.getElementById('urlInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('saveBtn').click();
});
