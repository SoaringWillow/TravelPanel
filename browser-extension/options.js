'use strict';

const DEFAULT_URL = 'https://travelpanel.vercel.app';

async function init() {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
  document.getElementById('url-input').value = travelpanelUrl;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = document.getElementById('url-input').value.trim();
    const url = raw || DEFAULT_URL;

    if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
      showStatus('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }

    await chrome.storage.sync.set({ travelpanelUrl: url });
    showStatus('Settings saved!', 'success');
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    document.getElementById('url-input').value = DEFAULT_URL;
    await chrome.storage.sync.set({ travelpanelUrl: DEFAULT_URL });
    showStatus('Reset to default URL.', 'success');
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3000);
}

init();
