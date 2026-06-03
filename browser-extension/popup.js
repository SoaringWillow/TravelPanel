'use strict';

const DEFAULT_SERVER = 'http://localhost:3000';

// ── Storage helpers ──────────────────────────────────────────────────────────

function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['serverUrl'], (result) => {
      resolve(result.serverUrl || DEFAULT_SERVER);
    });
  });
}

function setServerUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ serverUrl: url }, resolve);
  });
}

// ── Tab info ─────────────────────────────────────────────────────────────────

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

// ── State management ─────────────────────────────────────────────────────────

const STATES = ['idle-state', 'loading-state', 'preview-state', 'error-state'];

function showState(id) {
  STATES.forEach((s) => document.getElementById(s).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ── Main ─────────────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab();
  currentUrl = tab?.url || '';
  currentTitle = tab?.title || '';

  // Populate page preview strip
  document.getElementById('page-title').textContent = currentTitle || 'Untitled Page';
  document.getElementById('page-url').textContent = trimUrl(currentUrl);

  if (currentUrl.startsWith('http')) {
    try {
      const { hostname } = new URL(currentUrl);
      document.getElementById('favicon').src =
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      // ignore
    }
  }

  // Load saved server URL into settings input
  const serverUrl = await getServerUrl();
  document.getElementById('server-url').value = serverUrl;

  // Block clipping on non-http pages
  if (!currentUrl.startsWith('http')) {
    document.getElementById('clip-btn').disabled = true;
    document.querySelector('.hint-text').textContent =
      'Navigate to a travel webpage to clip it.';
  }

  // ── Event listeners ──
  document.getElementById('clip-btn').addEventListener('click', startClip);
  document.getElementById('retry-btn').addEventListener('click', startClip);

  document.getElementById('save-btn').addEventListener('click', async () => {
    const url = await getServerUrl();
    openSharePage(url);
  });

  document.getElementById('open-share-btn').addEventListener('click', async () => {
    const url = await getServerUrl();
    openSharePage(url);
  });

  document.getElementById('open-anyway-btn').addEventListener('click', async () => {
    const url = await getServerUrl();
    openSharePage(url);
  });

  document.getElementById('settings-btn').addEventListener('click', toggleSettings);
  document.getElementById('cancel-settings').addEventListener('click', toggleSettings);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
});

// ── Clip flow ────────────────────────────────────────────────────────────────

async function startClip() {
  const serverUrl = await getServerUrl();
  showState('loading-state');

  const msgs = [
    'Extracting travel wisdom…',
    'Finding locations…',
    'Reading tips & warnings…',
    'Almost done…',
  ];
  let msgIdx = 0;
  const msgEl = document.getElementById('loading-msg');
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    msgEl.textContent = msgs[msgIdx];
  }, 1800);

  try {
    const res = await fetch(`${serverUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl }),
    });

    clearInterval(msgInterval);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server returned ${res.status}`);
    }

    const data = await res.json();

    // Populate preview card
    document.getElementById('location-count').textContent = data.locations?.length ?? 0;
    document.getElementById('substance-count').textContent = data.substance?.length ?? 0;

    const tagsRow = document.getElementById('tags-row');
    tagsRow.innerHTML = '';
    (data.tags || []).slice(0, 6).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagsRow.appendChild(span);
    });

    showState('preview-state');
  } catch (err) {
    clearInterval(msgInterval);
    const isFetchError =
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('fetch');
    document.getElementById('error-msg').textContent = isFetchError
      ? `Cannot reach TravelPanel at ${serverUrl}. Check the server URL in settings.`
      : err.message;
    showState('error-state');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openSharePage(serverUrl) {
  const shareUrl =
    `${serverUrl}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;
  await chrome.tabs.create({ url: shareUrl });
  window.close();
}

function toggleSettings() {
  document.getElementById('settings-panel').classList.toggle('hidden');
}

async function saveSettings() {
  const val = document.getElementById('server-url').value.trim().replace(/\/$/, '');
  if (val) {
    await setServerUrl(val);
  }
  toggleSettings();
}

function trimUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}
