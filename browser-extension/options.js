const $ = (id) => document.getElementById(id);

async function load() {
  const { appUrl, devUrl } = await chrome.storage.sync.get(['appUrl', 'devUrl']);
  if (appUrl) $('appUrl').value = appUrl;
  if (devUrl) $('devUrl').value = devUrl;
}

$('useDevBtn').addEventListener('click', async () => {
  const { devUrl } = await chrome.storage.sync.get(['devUrl']);
  const url = devUrl || 'http://localhost:3000';
  $('appUrl').value = url;
});

$('saveBtn').addEventListener('click', async () => {
  const appUrl = $('appUrl').value.trim().replace(/\/$/, '');
  const devUrl = $('devUrl').value.trim().replace(/\/$/, '');

  await chrome.storage.sync.set({ appUrl, devUrl });

  const status = $('saveStatus');
  status.textContent = '✓ Saved';
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2500);
});

load();
