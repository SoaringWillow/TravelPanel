const DEFAULT_APP_URL = 'http://localhost:3000';

// ── Helpers ────────────────────────────────────────────────────────────────

function show(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id).classList.add('hidden');
}

function setStatus(message, type /* 'loading'|'success'|'error' */) {
  const area = document.getElementById('status-area');
  const msg = document.getElementById('status-message');
  msg.textContent = message;
  msg.className = `status-message ${type}`;
  area.classList.remove('hidden');
}

function clearStatus() {
  document.getElementById('status-area').classList.add('hidden');
}

async function getStoredAppUrl() {
  const data = await chrome.storage.sync.get('appUrl');
  return data.appUrl || '';
}

async function setStoredAppUrl(url) {
  await chrome.storage.sync.set({ appUrl: url.replace(/\/$/, '') });
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return urlStr;
  }
}

// ── Setup screen ───────────────────────────────────────────────────────────

function initSetupScreen() {
  show('setup-screen');

  const input = document.getElementById('setup-url');
  const saveBtn = document.getElementById('setup-save-btn');

  input.addEventListener('input', () => {
    saveBtn.disabled = !isValidUrl(input.value.trim());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click();
  });

  saveBtn.addEventListener('click', async () => {
    const url = input.value.trim();
    if (!isValidUrl(url)) return;
    await setStoredAppUrl(url);
    hide('setup-screen');
    initClipScreen(url);
  });
}

// ── Clip screen ────────────────────────────────────────────────────────────

async function initClipScreen(appUrl) {
  show('clip-screen');

  // Get current tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showError('Could not read the current tab.');
    return;
  }

  // Check if the current page is clippable
  const pageUrl = tab.url || '';
  if (!pageUrl || pageUrl.startsWith('chrome://') || pageUrl.startsWith('chrome-extension://') || pageUrl.startsWith('about:')) {
    showError('This page cannot be clipped.\nNavigate to a travel website and try again.');
    return;
  }

  // Populate page info
  const title = tab.title || getDomain(pageUrl);
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-domain').textContent = getDomain(pageUrl);

  // Favicon (Google's favicon service as reliable fallback)
  const favicon = document.getElementById('favicon');
  favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getDomain(pageUrl))}&sz=32`;
  favicon.onerror = () => { favicon.style.visibility = 'hidden'; };

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Open app button
  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  // Clip button
  const clipBtn = document.getElementById('clip-btn');
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    document.getElementById('clip-btn-icon').innerHTML = '<span class="spinner"></span>';
    document.getElementById('clip-btn-text').textContent = 'Opening…';
    clearStatus();

    const shareUrl = buildShareUrl(appUrl, pageUrl, title);

    try {
      await chrome.windows.create({
        url: shareUrl,
        type: 'popup',
        width: 430,
        height: 640,
        focused: true,
      });
      // Close the extension popup — the share window takes over
      window.close();
    } catch (err) {
      // Fallback: open as a tab if windows.create fails
      await chrome.tabs.create({ url: shareUrl });
      window.close();
    }
  });
}

function buildShareUrl(appUrl, pageUrl, title) {
  const params = new URLSearchParams({
    url: pageUrl,
    title: title,
    ref: 'extension',
  });
  return `${appUrl}/share?${params.toString()}`;
}

// ── Error screen ────────────────────────────────────────────────────────────

function showError(message) {
  hide('clip-screen');
  hide('setup-screen');
  show('error-screen');
  document.getElementById('error-message').textContent = message;

  document.getElementById('error-retry-btn').addEventListener('click', () => {
    window.location.reload();
  });
}

// ── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const appUrl = await getStoredAppUrl();

  if (!appUrl) {
    initSetupScreen();
  } else {
    initClipScreen(appUrl);
  }
});
