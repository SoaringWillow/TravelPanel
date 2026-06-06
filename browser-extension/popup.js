'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORM_PATTERNS = [
  { pattern: /instagram\.com/, key: 'instagram', label: 'Instagram' },
  { pattern: /youtube\.com|youtu\.be/, key: 'youtube', label: 'YouTube' },
  { pattern: /xiaohongshu\.com|xhslink\.com/, key: 'xiaohongshu', label: 'Xiaohongshu' },
  { pattern: /tiktok\.com/, key: 'tiktok', label: 'TikTok' },
  { pattern: /twitter\.com|x\.com/, key: 'twitter', label: 'Twitter / X' },
];

function detectPlatform(url) {
  for (const { pattern, key, label } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { key, label };
  }
  return { key: 'other', label: 'Web' };
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 30 ? u.pathname.slice(0, 30) + '…' : u.pathname);
  } catch {
    return url.slice(0, 40);
  }
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const clipBtn = document.getElementById('clipBtn');
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const pageFavicon = document.getElementById('pageFavicon');
  const platformBadge = document.getElementById('platformBadge');
  const platformLabel = document.getElementById('platformLabel');
  const statusMsg = document.getElementById('statusMsg');
  const unsupportedMsg = document.getElementById('unsupportedMsg');
  const settingsBtn = document.getElementById('settingsBtn');

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showUnsupported();
    return;
  }

  const tab = tabs[0];
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
    showUnsupported();
    return;
  }

  const title = tab.title || 'Untitled page';
  const url = tab.url;
  const favicon = tab.favIconUrl;
  const platform = detectPlatform(url);

  pageTitle.textContent = title;
  pageUrl.textContent = shortenUrl(url);

  if (favicon) {
    const img = document.createElement('img');
    img.src = favicon;
    img.alt = '';
    pageFavicon.appendChild(img);
  }

  platformBadge.style.display = 'flex';
  platformBadge.className = `platform-badge platform-${platform.key}`;
  platformLabel.textContent = platform.label;

  clipBtn.disabled = false;

  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = 'Opening TravelPanel…';

    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    try {
      await chrome.tabs.create({ url: shareUrl });
      clipBtn.classList.add('success');
      clipBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Clipped!
      `;
      statusMsg.style.display = 'block';
      statusMsg.textContent = 'Opening the TravelPanel share sheet…';

      setTimeout(() => window.close(), 1500);
    } catch (err) {
      clipBtn.disabled = false;
      clipBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
        </svg>
        Clip to TravelPanel
      `;
      statusMsg.style.display = 'block';
      statusMsg.className = 'status error';
      statusMsg.textContent = 'Failed to open. Check your app URL in settings.';
    }
  });

  function showUnsupported() {
    document.getElementById('pageInfo').style.display = 'none';
    clipBtn.style.display = 'none';
    unsupportedMsg.style.display = 'flex';
  }
}

init();
