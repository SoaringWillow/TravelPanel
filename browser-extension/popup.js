const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const UNSUPPORTED_SCHEMES = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'brave:', 'moz-extension:', 'data:', 'javascript:'];

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    return url.slice(0, 50);
  }
}

function getFaviconUrl(pageUrl) {
  try {
    const u = new URL(pageUrl);
    return `${u.protocol}//${u.hostname}/favicon.ico`;
  } catch {
    return null;
  }
}

function isUnsupportedUrl(url) {
  if (!url) return true;
  return UNSUPPORTED_SCHEMES.some(s => url.startsWith(s));
}

function showState(id) {
  ['loading-state', 'content-state', 'unsupported-state', 'success-state'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const appUrl = await getAppUrl();

  // Footer
  document.getElementById('app-url-display').textContent = new URL(appUrl).hostname;
  document.getElementById('settings-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('change-url-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());

  if (!tab || isUnsupportedUrl(tab.url)) {
    showState('unsupported-state');
    return;
  }

  // Populate page info
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const faviconEl = document.getElementById('page-favicon');

  titleEl.textContent = tab.title || tab.url;
  urlEl.textContent = formatUrl(tab.url);

  const faviconUrl = getFaviconUrl(tab.url);
  if (faviconUrl) {
    faviconEl.src = faviconUrl;
    faviconEl.onerror = () => faviconEl.classList.add('hidden');
  } else {
    faviconEl.classList.add('hidden');
  }

  showState('content-state');

  // Clip button
  document.getElementById('clip-btn').addEventListener('click', async () => {
    showState('success-state');

    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
    await chrome.tabs.create({ url: shareUrl });

    // Close popup after brief delay so user sees success state
    setTimeout(() => window.close(), 600);
  });
});
