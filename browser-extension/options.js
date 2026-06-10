const DEFAULT_URL = 'https://travelpanel.vercel.app';

const urlInput = document.getElementById('panel-url');
const saveBtn  = document.getElementById('save-btn');
const testBtn  = document.getElementById('test-btn');
const toast    = document.getElementById('toast');

let toastTimer = null;

function showToast(msg, duration = 2500) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Load saved settings ───────────────────────────────────────────────────────

async function load() {
  const { panelUrl = DEFAULT_URL } = await chrome.storage.sync.get('panelUrl');
  urlInput.value = panelUrl;
}

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim();
  if (!raw) { showToast('⚠️ Please enter a URL'); return; }

  let url;
  try {
    url = new URL(raw).origin;
  } catch {
    showToast('⚠️ Invalid URL — include http:// or https://');
    return;
  }

  await chrome.storage.sync.set({ panelUrl: url });
  urlInput.value = url;
  showToast('✅ Settings saved!');
});

// ── Test connection ───────────────────────────────────────────────────────────

testBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim() || DEFAULT_URL;
  let url;
  try {
    url = new URL(raw).origin;
  } catch {
    showToast('⚠️ Invalid URL');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';

  try {
    const res = await fetch(url, { mode: 'no-cors', cache: 'no-store' });
    showToast(`✅ Connected to ${url}`);
  } catch {
    showToast(`❌ Could not reach ${url}`);
  } finally {
    testBtn.disabled   = false;
    testBtn.textContent = 'Test Connection';
  }
});

// ── Preset buttons ────────────────────────────────────────────────────────────

document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    urlInput.value = btn.dataset.url;
  });
});

// ── Allow Enter to save ───────────────────────────────────────────────────────

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

load();
