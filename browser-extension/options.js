// TravelPanel Clipper — Options page

async function load() {
  const { travelPanelUrl = '', clipCount = 0 } = await chrome.storage.sync.get({
    travelPanelUrl: '',
    clipCount: 0,
  });
  document.getElementById('tp-url').value       = travelPanelUrl;
  document.getElementById('stat-clips').textContent = clipCount;
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const url = document.getElementById('tp-url').value.trim();
  await chrome.storage.sync.set({ travelPanelUrl: url });
  const toast = document.getElementById('toast');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm('Reset your clip count to 0?')) return;
  await chrome.storage.sync.set({ clipCount: 0 });
  document.getElementById('stat-clips').textContent = '0';
});

load();
