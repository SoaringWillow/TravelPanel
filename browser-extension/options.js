async function init() {
  const { appUrl } = await chrome.storage.sync.get('appUrl');
  if (appUrl) document.getElementById('appUrl').value = appUrl;

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const val = document.getElementById('appUrl').value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ appUrl: val });

    const toast = document.getElementById('toast');
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2200);
  });

  document.getElementById('appUrl').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('saveBtn').click();
  });
}

init().catch(console.error);
