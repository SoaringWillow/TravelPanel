const DEFAULT_URL = 'https://travelpanel.vercel.app';

async function init() {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');
  document.getElementById('url-input').value = travelpanelUrl;

  document.getElementById('save-btn').addEventListener('click', async () => {
    const raw = document.getElementById('url-input').value.trim();
    const url = raw.replace(/\/$/, '') || DEFAULT_URL;

    await chrome.storage.sync.set({ travelpanelUrl: url });

    const status = document.getElementById('status');
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 2000);
  });

  document.getElementById('url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-btn').click();
  });
}

init();
