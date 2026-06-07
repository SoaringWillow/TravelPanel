const DEFAULT_URL = 'https://your-app.vercel.app';

const BLOCKED_SCHEMES = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://'];

function showState(id) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : str;
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_URL }, data => resolve(data.appUrl || DEFAULT_URL));
  });
}

async function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  });
}

async function init() {
  const appUrl = await getAppUrl();
  const isUnconfigured = !appUrl || appUrl === DEFAULT_URL;

  const tab = await getCurrentTab();
  if (!tab || !tab.url) {
    showState('stateError');
    document.getElementById('errorMessage').textContent = 'No active tab found.';
    return;
  }

  const isBlocked = BLOCKED_SCHEMES.some(s => tab.url.startsWith(s));
  if (isBlocked) {
    showState('stateError');
    document.getElementById('errorMessage').textContent = 'Browser pages can\'t be clipped.';
    return;
  }

  // Populate page preview
  const titleEl = document.getElementById('pageTitle');
  const urlEl = document.getElementById('pageUrl');
  const faviconEl = document.getElementById('pageFavicon');

  titleEl.textContent = truncate(tab.title || tab.url, 60);
  urlEl.textContent = truncate(tab.url, 55);

  if (tab.favIconUrl) {
    faviconEl.innerHTML = `<img src="${tab.favIconUrl}" alt="" onerror="this.style.display='none'">`;
  }

  if (isUnconfigured) {
    showState('stateUnconfigured');
    return;
  }

  showState('stateDefault');

  document.getElementById('clipBtn').addEventListener('click', () => clip(tab, appUrl));
  document.getElementById('retryBtn').addEventListener('click', () => {
    showState('stateDefault');
  });
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function clip(tab, appUrl) {
  const base = appUrl.replace(/\/$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;

  showState('stateSuccess');

  setTimeout(() => {
    chrome.tabs.create({ url: shareUrl });
    window.close();
  }, 700);
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
