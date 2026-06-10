const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function isConfigured() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl', 'configured'], (result) => {
      resolve(result.configured === true || !!result.appUrl);
    });
  });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(tabUrl) {
  try {
    const origin = new URL(tabUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function isRestrictedUrl(url) {
  return !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
    url.startsWith('about:') || url.startsWith('moz-extension://') ||
    url.startsWith('edge://') || url.startsWith('safari-extension://') ||
    url.startsWith('data:') || url.startsWith('file://') ||
    url.startsWith('devtools://');
}

function buildShareUrl(appUrl, pageUrl, pageTitle) {
  const base = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl });
  if (pageTitle) params.set('title', pageTitle);
  return `${base}/share?${params.toString()}`;
}

async function init() {
  const clipBtn = document.getElementById('clipBtn');
  const clipBtnLabel = document.getElementById('clipBtnLabel');
  const pageTitleEl = document.getElementById('pageTitle');
  const pageDomainEl = document.getElementById('pageDomain');
  const faviconWrap = document.getElementById('faviconWrap');
  const pageCard = document.getElementById('pageCard');
  const restrictedNotice = document.getElementById('restrictedNotice');
  const setupNotice = document.getElementById('setupNotice');
  const openAppLink = document.getElementById('openAppLink');
  const settingsBtn = document.getElementById('settingsBtn');
  const setupLink = document.getElementById('setupLink');

  // Settings button → open options page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  setupLink.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const [appUrl, configured] = await Promise.all([getAppUrl(), isConfigured()]);

  // Open app link in footer
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  if (!configured) {
    setupNotice.style.display = 'block';
  }

  // Query the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || isRestrictedUrl(tab.url)) {
    pageCard.style.display = 'none';
    restrictedNotice.style.display = 'block';
    return;
  }

  const url = tab.url || '';
  const title = tab.title || '';
  const domain = getDomain(url);

  pageTitleEl.textContent = title || domain;
  pageDomainEl.textContent = domain;

  // Load favicon
  const faviconUrl = getFaviconUrl(url);
  if (faviconUrl) {
    const img = document.createElement('img');
    img.onload = () => {
      faviconWrap.innerHTML = '';
      faviconWrap.appendChild(img);
    };
    img.src = faviconUrl;
  }

  clipBtn.disabled = false;

  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    clipBtnLabel.textContent = 'Opening TravelPanel…';
    clipBtn.classList.add('success');
    clipBtn.querySelector('.btn-icon').textContent = '✓';

    const shareUrl = buildShareUrl(appUrl, url, title);
    chrome.tabs.create({ url: shareUrl });

    // Auto-close after brief delay
    setTimeout(() => window.close(), 800);
  });
}

init();
