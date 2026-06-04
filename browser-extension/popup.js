const DEFAULT_APP_URL = '';

let currentTab = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (data) => {
      resolve((data.appUrl || '').replace(/\/$/, ''));
    });
  });
}

function showState(name) {
  ['Idle', 'Loading', 'Success', 'Error'].forEach((s) => {
    const el = document.getElementById(`state${s}`);
    if (el) el.classList.toggle('hidden', s.toLowerCase() !== name);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    const titleEl = document.getElementById('pageTitle');
    const urlEl = document.getElementById('pageUrl');
    const favEl = document.getElementById('favicon');

    titleEl.textContent = truncate(tab.title || 'Untitled page', 55);
    urlEl.textContent = truncate(tab.url || '', 52);

    try {
      const { hostname } = new URL(tab.url);
      favEl.src = `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`;
      favEl.onerror = () => {
        favEl.style.display = 'none';
      };
    } catch {
      favEl.style.display = 'none';
    }
  } catch (err) {
    document.getElementById('pageTitle').textContent = 'Unknown page';
  }
}

// ── Clip action ───────────────────────────────────────────────────────────────

async function doClip() {
  if (!currentTab?.url) {
    showError('No active tab URL found.');
    return;
  }

  const appUrl = await getAppUrl();

  if (!appUrl) {
    showError('TravelPanel app URL is not set. Click the settings gear to configure it.');
    return;
  }

  showState('loading');

  try {
    const shareUrl =
      `${appUrl}/share` +
      `?url=${encodeURIComponent(currentTab.url)}` +
      `&title=${encodeURIComponent(currentTab.title || '')}`;

    await chrome.tabs.create({ url: shareUrl });
    showState('success');
  } catch (err) {
    showError(err?.message || 'Failed to open TravelPanel.');
  }
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('clipBtn').addEventListener('click', doClip);
document.getElementById('retryBtn').addEventListener('click', doClip);

document.getElementById('clipAnotherBtn').addEventListener('click', () => {
  showState('idle');
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Boot ─────────────────────────────────────────────────────────────────────

init();
