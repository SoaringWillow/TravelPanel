/* global chrome */

async function init() {
  const { appUrl, pendingClips = [] } = await chrome.storage.local.get(['appUrl', 'pendingClips']);

  if (appUrl) document.getElementById('app-url').value = appUrl;

  const count = pendingClips.length;
  document.getElementById('clip-count').textContent =
    `${count} clip${count !== 1 ? 's' : ''} pending sync`;

  document.getElementById('save-url').addEventListener('click', async () => {
    let url = document.getElementById('app-url').value.trim().replace(/\/+$/, '');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await chrome.storage.local.set({ appUrl: url });
    const msg = document.getElementById('url-saved');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });

  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (!confirm('Clear all pending clips? This cannot be undone.')) return;
    await chrome.storage.local.set({ pendingClips: [] });
    document.getElementById('clip-count').textContent = '0 clips pending sync';
  });
}

document.addEventListener('DOMContentLoaded', init);
