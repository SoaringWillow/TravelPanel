const DEFAULT_TRAVELPANEL_URL = 'https://travel-panel.vercel.app';

async function init() {
  const { travelPanelUrl = DEFAULT_TRAVELPANEL_URL } = await chrome.storage.sync.get('travelPanelUrl');
  document.getElementById('url-input').value = travelPanelUrl;

  document.getElementById('save-btn').addEventListener('click', async () => {
    let url = document.getElementById('url-input').value.trim().replace(/\/$/, '');
    if (!url) url = DEFAULT_TRAVELPANEL_URL;

    // Basic URL validation
    try { new URL(url); } catch {
      document.getElementById('url-input').style.borderColor = '#ef4444';
      return;
    }

    await chrome.storage.sync.set({ travelPanelUrl: url });

    const status = document.getElementById('status-msg');
    status.className = 'status success visible';
    setTimeout(() => { status.className = 'status success'; }, 2000);
  });

  document.getElementById('open-app-btn').addEventListener('click', async () => {
    const { travelPanelUrl = DEFAULT_TRAVELPANEL_URL } = await chrome.storage.sync.get('travelPanelUrl');
    chrome.tabs.create({ url: travelPanelUrl });
  });

  document.getElementById('test-share-btn').addEventListener('click', async () => {
    const { travelPanelUrl = DEFAULT_TRAVELPANEL_URL } = await chrome.storage.sync.get('travelPanelUrl');
    const testUrl = new URL('/share', travelPanelUrl);
    testUrl.searchParams.set('url', 'https://www.instagram.com/p/test123');
    testUrl.searchParams.set('title', 'Test clip from extension');
    chrome.tabs.create({ url: testUrl.toString() });
  });
}

init().catch(console.error);
