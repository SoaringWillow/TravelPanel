'use strict';

async function init() {
  const input    = document.getElementById('app-url');
  const saveBtn  = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');

  // Load stored value
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: '' });
  if (travelPanelUrl) input.value = travelPanelUrl;

  // Save on button click
  saveBtn.addEventListener('click', save);

  // Save on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });

  async function save() {
    const raw = input.value.trim();

    // Normalise — add https:// if missing
    let url = raw;
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      input.value = url;
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');

    await chrome.storage.sync.set({ travelPanelUrl: url });

    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 2500);
  }
}

init().catch(console.error);
