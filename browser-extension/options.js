'use strict';

async function init() {
  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');
  document.getElementById('urlInput').value = travelpanelUrl;

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const url = document.getElementById('urlInput').value.trim();
    await chrome.storage.sync.set({ travelpanelUrl: url });

    const msg = document.getElementById('savedMsg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('urlInput').value = btn.dataset.url;
    });
  });
}

init().catch(err => {
  console.error('[TravelPanel] options error:', err);
});
