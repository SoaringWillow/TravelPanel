/* options.js */
'use strict';

async function load() {
  const data = await chrome.storage.local.get(['appUrl', 'pendingClips', 'cachedBoards', 'totalClipped']);
  document.getElementById('appUrlInput').value = data.appUrl || '';

  const pending = (data.pendingClips || []).length;
  const boards  = (data.cachedBoards || []).length;
  const total   = data.totalClipped || 0;

  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('boardsCount').textContent  = boards;
  document.getElementById('totalClipped').textContent = total;

  document.getElementById('clearPendingBtn').style.display = pending > 0 ? '' : 'none';
}

async function save() {
  const raw = document.getElementById('appUrlInput').value.trim();
  const appUrl = raw.replace(/\/$/, '');

  if (appUrl && !appUrl.startsWith('http')) {
    alert('URL must start with http:// or https://');
    return;
  }

  await chrome.storage.local.set({ appUrl });

  const msg = document.getElementById('savedMsg');
  msg.style.display = '';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

document.getElementById('saveBtn').addEventListener('click', save);

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('appUrlInput').value = btn.dataset.url;
  });
});

document.getElementById('clearPendingBtn').addEventListener('click', async () => {
  await chrome.storage.local.set({ pendingClips: [] });
  await chrome.action.setBadgeText({ text: '' });
  load();
});

load();
