const STORAGE_KEY = 'travelPanelUrl';

async function load() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const input = document.getElementById('app-url');
  if (stored[STORAGE_KEY]) {
    input.value = stored[STORAGE_KEY];
  }
}

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg visible ${type}`;
  setTimeout(() => { el.className = 'status-msg'; }, 2500);
}

async function save() {
  const input = document.getElementById('app-url');
  let url = input.value.trim().replace(/\/$/, '');

  if (!url) {
    showStatus('Please enter a URL.', 'error');
    return;
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    url = parsed.origin + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    showStatus('Enter a valid URL (https://…)', 'error');
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: url });
  input.value = url;
  showStatus('✓ Saved!', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  load();

  document.getElementById('save-btn').addEventListener('click', save);

  document.getElementById('app-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
});
