const DEFAULT_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', async () => {
  const appUrlInput = document.getElementById('app-url');
  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');

  const { travelPanelUrl = DEFAULT_URL } = await new Promise((resolve) => {
    chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL }, resolve);
  });

  appUrlInput.value = travelPanelUrl;

  saveBtn.addEventListener('click', () => {
    const raw = appUrlInput.value.trim();
    let url = raw || DEFAULT_URL;

    // Normalise: strip trailing slash
    url = url.replace(/\/$/, '');

    try {
      new URL(url); // validate
    } catch {
      appUrlInput.style.borderColor = '#dc2626';
      appUrlInput.focus();
      return;
    }

    appUrlInput.style.borderColor = '';
    chrome.storage.sync.set({ travelPanelUrl: url }, () => {
      savedMsg.classList.add('visible');
      setTimeout(() => savedMsg.classList.remove('visible'), 2000);
    });
  });
});
