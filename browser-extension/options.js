// TravelPanel Clipper — Options page script

const urlInput = document.getElementById('urlInput');
const saveBtn  = document.getElementById('saveBtn');
const status   = document.getElementById('status');

// Load saved URL on open
chrome.storage.sync.get({ travelpanelUrl: '' }, ({ travelpanelUrl }) => {
  urlInput.value = travelpanelUrl;
});

// Save on button click
saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim();

  if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
    status.textContent = 'URL must start with http:// or https://';
    status.className = 'status error';
    return;
  }

  const cleaned = raw.replace(/\/$/, '');
  chrome.storage.sync.set({ travelpanelUrl: cleaned }, () => {
    status.textContent = '✓ Saved!';
    status.className = 'status success';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

// Allow save on Enter
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
