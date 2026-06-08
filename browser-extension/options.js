const DEFAULT_URL = 'http://localhost:3000';

async function init() {
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  document.getElementById('app-url-input').value = appUrl || DEFAULT_URL;

  await renderCachedBoards();

  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('test-btn').addEventListener('click', testConnection);
  document.getElementById('clear-cache-btn').addEventListener('click', clearCache);
  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('app-url-input').value = chip.dataset.url;
    });
  });
}

async function saveSettings() {
  const raw = document.getElementById('app-url-input').value.trim().replace(/\/$/, '');
  if (!raw) { showToast('Please enter a URL'); return; }

  try { new URL(raw); } catch { showToast('Invalid URL — include https:// or http://'); return; }

  await chrome.storage.sync.set({ appUrl: raw });
  showToast('✓ Settings saved');
}

async function testConnection() {
  const raw = document.getElementById('app-url-input').value.trim().replace(/\/$/, '');
  if (!raw) { setStatus('Enter a URL first', 'err'); return; }

  setStatus('Testing…', 'pending');
  try {
    const res = await fetch(`${raw}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      setStatus('✓ Connected — TravelPanel is running', 'ok');
    } else {
      // Still reachable, just no /api/health route
      setStatus('✓ App is reachable (no health endpoint)', 'ok');
    }
  } catch {
    // CORS/network errors are expected from extension context; check differently
    try {
      const res2 = await fetch(raw, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      setStatus(res2.ok ? '✓ App is reachable' : `HTTP ${res2.status} — check URL`, res2.ok ? 'ok' : 'err');
    } catch {
      setStatus('Cannot reach app — check the URL and that the server is running', 'err');
    }
  }
}

function setStatus(msg, type) {
  const el = document.getElementById('status-row');
  el.textContent = msg;
  el.className = `status-row status-${type}`;
}

async function renderCachedBoards() {
  const { cachedBoards } = await chrome.storage.local.get(['cachedBoards']);
  const el = document.getElementById('boards-preview');

  if (!cachedBoards?.length) {
    el.innerHTML = '<span class="muted">No boards cached yet. Open TravelPanel in a tab and click the extension icon.</span>';
    return;
  }

  el.replaceChildren();
  for (const b of cachedBoards) {
    const tag = document.createElement('div');
    tag.className = 'board-tag';
    tag.textContent = `${b.emoji || '📁'} ${b.name}`;
    el.appendChild(tag);
  }
}

async function clearCache() {
  await chrome.storage.local.remove(['cachedBoards', 'boardsCachedAt']);
  await renderCachedBoards();
  showToast('Board cache cleared');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2500);
}

document.addEventListener('DOMContentLoaded', init);
