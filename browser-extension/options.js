async function init() {
  const { tpServerUrl } = await chrome.storage.local.get('tpServerUrl');
  if (tpServerUrl) {
    document.getElementById('serverUrl').value = tpServerUrl;
  }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const input = document.getElementById('serverUrl');
  const url = input.value.trim().replace(/\/$/, '');
  const status = document.getElementById('status');

  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    status.style.color = '#F87171';
    status.textContent = '⚠ Must start with http:// or https://';
    return;
  }

  await chrome.storage.local.set({ tpServerUrl: url });
  status.style.color = '#4ADE80';
  status.textContent = '✓ Saved';
  setTimeout(() => { status.textContent = ''; }, 2500);
});

// Save on Enter
document.getElementById('serverUrl').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('saveBtn').click();
});

init().catch(console.error);
