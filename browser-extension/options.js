// Options page logic

async function load() {
  const { travelPanelUrl } = await chrome.storage.sync.get(['travelPanelUrl']);
  if (travelPanelUrl) document.getElementById('urlInput').value = travelPanelUrl;

  const { pendingClips } = await chrome.storage.local.get(['pendingClips']);
  const n = (pendingClips || []).length;
  document.getElementById('clipCount').textContent =
    n === 0 ? 'No clips in extension storage' : `${n} clip${n !== 1 ? 's' : ''} in extension storage`;
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const raw = document.getElementById('urlInput').value.trim().replace(/\/$/, '');
  if (!raw) { alert('Please enter a URL'); return; }
  try { new URL(raw); } catch { alert('Enter a valid URL (must start with http:// or https://)'); return; }

  await chrome.storage.sync.set({ travelPanelUrl: raw });

  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
});

document.getElementById('clearBtn').addEventListener('click', async () => {
  const { pendingClips } = await chrome.storage.local.get(['pendingClips']);
  const n = (pendingClips || []).length;
  if (!n) { alert('Nothing to clear.'); return; }
  if (!confirm(`Delete ${n} clip${n !== 1 ? 's' : ''} from extension storage? This cannot be undone.`)) return;
  await chrome.storage.local.remove(['pendingClips']);
  document.getElementById('clipCount').textContent = 'No clips in extension storage';
});

load();
