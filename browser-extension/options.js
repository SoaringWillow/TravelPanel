/* global chrome */

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const appUrlInput = document.getElementById('appUrl');
const saveBtn     = document.getElementById('saveBtn');
const toast       = document.getElementById('toast');
const recentList  = document.getElementById('recentList');
const clearBtn    = document.getElementById('clearBtn');

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} visible`;
  setTimeout(() => { toast.className = 'toast'; }, 2500);
}

function renderRecentClips(clips) {
  if (!clips || clips.length === 0) {
    recentList.innerHTML = '<li>No clips yet.</li>';
    return;
  }
  recentList.innerHTML = clips
    .slice(0, 10)
    .map(c => {
      const title = c.title || c.url;
      const time  = new Date(c.ts).toLocaleDateString();
      return `<li title="${c.url}">${time} — ${title}</li>`;
    })
    .join('');
}

async function load() {
  const data = await chrome.storage.sync.get(['appUrl']);
  appUrlInput.value = data.appUrl || DEFAULT_APP_URL;

  const local = await chrome.storage.local.get(['recentClips']);
  renderRecentClips(local.recentClips || []);
}

saveBtn.addEventListener('click', async () => {
  const url = appUrlInput.value.trim();
  if (!url) {
    showToast('Please enter a URL.', 'error');
    return;
  }
  try {
    new URL(url);
  } catch {
    showToast('Invalid URL — include https://', 'error');
    return;
  }

  await chrome.storage.sync.set({ appUrl: url });
  showToast('Settings saved!');
});

clearBtn.addEventListener('click', async () => {
  await chrome.storage.local.set({ recentClips: [] });
  renderRecentClips([]);
  showToast('History cleared.');
});

load();
