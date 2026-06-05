'use strict';

const DEFAULT_APP_URL = '';

// ─── DOM refs ────────────────────────────────────────────────────────────────

const screens = {
  setup:     document.getElementById('setup-screen'),
  clip:      document.getElementById('clip-screen'),
  clipping:  document.getElementById('clipping-screen'),
  success:   document.getElementById('success-screen'),
  error:     document.getElementById('error-screen'),
};

// ─── Screen management ───────────────────────────────────────────────────────

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
      resolve((appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

function setAppUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ appUrl: url.replace(/\/$/, '') }, resolve);
  });
}

// ─── Current tab ─────────────────────────────────────────────────────────────

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      resolve(tab || null);
    });
  });
}

// ─── Clip action ─────────────────────────────────────────────────────────────

async function clipCurrentPage(appUrl, tab) {
  showScreen('clipping');

  const url   = encodeURIComponent(tab.url || '');
  const title = encodeURIComponent(tab.title || '');
  const shareUrl = `${appUrl}/share?url=${url}&title=${title}`;

  // Open the share page as a compact popup window
  const width  = 480;
  const height = 640;

  chrome.windows.create(
    {
      url:    shareUrl,
      type:   'popup',
      width,
      height,
      focused: true,
    },
    (win) => {
      if (chrome.runtime.lastError || !win) {
        showError('Could not open TravelPanel. Check your app URL in settings.');
        return;
      }
      showScreen('success');
      // Close popup after a short delay
      setTimeout(() => window.close(), 2200);
    }
  );
}

// ─── Error ───────────────────────────────────────────────────────────────────

function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  showScreen('error');
}

// ─── Setup screen ────────────────────────────────────────────────────────────

function initSetupScreen() {
  const input   = document.getElementById('setup-url');
  const saveBtn = document.getElementById('setup-save-btn');

  saveBtn.addEventListener('click', async () => {
    const val = input.value.trim();
    if (!val) {
      input.focus();
      return;
    }
    // Basic URL validation
    try {
      new URL(val);
    } catch {
      input.style.borderColor = 'var(--error)';
      input.focus();
      return;
    }
    await setAppUrl(val);
    initApp();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    input.style.borderColor = '';
  });
}

// ─── Clip screen ─────────────────────────────────────────────────────────────

function populatePageCard(tab) {
  const titleEl   = document.getElementById('page-title');
  const urlEl     = document.getElementById('page-url');
  const faviconEl = document.getElementById('page-favicon');

  titleEl.textContent = tab.title || tab.url || 'Untitled page';

  try {
    const parsed = new URL(tab.url || '');
    urlEl.textContent = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    urlEl.textContent = tab.url || '';
  }

  const faviconSrc = tab.favIconUrl || getFaviconUrl(tab.url);
  if (faviconSrc) {
    faviconEl.src = faviconSrc;
    faviconEl.onerror = () => {
      faviconEl.parentElement.innerHTML = getDefaultFavicon();
    };
  } else {
    faviconEl.parentElement.innerHTML = getDefaultFavicon();
  }
}

function getFaviconUrl(pageUrl) {
  try {
    const parsed = new URL(pageUrl || '');
    return `${parsed.protocol}//${parsed.hostname}/favicon.ico`;
  } catch {
    return null;
  }
}

function getDefaultFavicon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#94a3b8"/>
  </svg>`;
}

function initClipScreen(appUrl, tab) {
  populatePageCard(tab);

  document.getElementById('clip-btn').addEventListener('click', () => {
    clipCurrentPage(appUrl, tab);
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// ─── Error screen ────────────────────────────────────────────────────────────

function initErrorScreen() {
  document.getElementById('error-retry-btn').addEventListener('click', () => {
    initApp();
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function initApp() {
  const [appUrl, tab] = await Promise.all([getAppUrl(), getCurrentTab()]);

  if (!appUrl) {
    showScreen('setup');
    initSetupScreen();
    return;
  }

  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    showError("Can't clip this page — try a regular website.");
    initErrorScreen();
    return;
  }

  showScreen('clip');
  initClipScreen(appUrl, tab);
}

initApp();
