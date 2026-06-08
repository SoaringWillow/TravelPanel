'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');
  const input     = document.getElementById('url-input');
  const statusMsg = document.getElementById('status-msg');

  input.value = travelPanelUrl;

  // ── Preset buttons ──
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.url;
      input.classList.remove('error');
    });
  });

  // ── Save ──
  document.getElementById('save-btn').addEventListener('click', async () => {
    const raw = input.value.trim();
    const url = raw.replace(/\/$/, '');

    if (url && !/^https?:\/\//.test(url)) {
      input.classList.add('error');
      showStatus('URL must start with http:// or https://', 'error');
      return;
    }

    input.classList.remove('error');
    await chrome.storage.sync.set({ travelPanelUrl: url });
    showStatus('✓ Saved!', 'success');
  });

  // ── Clear ──
  document.getElementById('reset-btn').addEventListener('click', async () => {
    input.value = '';
    input.classList.remove('error');
    await chrome.storage.sync.set({ travelPanelUrl: '' });
    showStatus('Cleared.', 'success');
  });

  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 2500);
  }
});
