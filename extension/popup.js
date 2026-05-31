const DEFAULT_URL = 'https://travelpanel.vercel.app';

const PLATFORM_PATTERNS = [
  { pattern: /instagram\.com/i, label: 'Instagram', cls: 'instagram' },
  { pattern: /youtube\.com|youtu\.be/i, label: 'YouTube', cls: 'youtube' },
  { pattern: /xiaohongshu\.com|xhslink\.com/i, label: '小红书', cls: 'xiaohongshu' },
  { pattern: /tiktok\.com/i, label: 'TikTok', cls: 'tiktok' },
  { pattern: /twitter\.com|x\.com/i, label: 'X / Twitter', cls: 'twitter' },
];

function detectPlatform(url) {
  for (const { pattern, label, cls } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { label, cls };
  }
  return null;
}

async function getStoredUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['travelpanelUrl'], (res) => {
      resolve(res.travelpanelUrl || '');
    });
  });
}

function showState(id) {
  for (const s of ['state-setup', 'state-ready', 'state-success']) {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  }
}

async function init() {
  const storedUrl = await getStoredUrl();

  if (!storedUrl) {
    showState('state-setup');
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';

  showState('state-ready');

  // Populate page info
  document.getElementById('page-title').textContent = title || url;
  try {
    const urlObj = new URL(url);
    document.getElementById('page-url').textContent = urlObj.hostname + urlObj.pathname.replace(/\/$/, '');
  } catch {
    document.getElementById('page-url').textContent = url;
  }

  // Favicon
  const faviconEl = document.getElementById('page-favicon');
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.onerror = () => { faviconEl.style.display = 'none'; };
  } else {
    faviconEl.style.display = 'none';
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    const badge = document.getElementById('platform-badge');
    badge.textContent = platform.label;
    badge.className = `platform-badge ${platform.cls}`;
    badge.classList.remove('hidden');
  }

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Clip button
  document.getElementById('btn-clip').addEventListener('click', async () => {
    if (!url || url.startsWith('chrome://') || url.startsWith('about:')) {
      return;
    }

    showState('state-success');

    const shareUrl = `${storedUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    // Try to find an existing TravelPanel tab and navigate it, otherwise open new
    const tpTabs = await chrome.tabs.query({ url: `${storedUrl.replace(/\/$/, '')}/*` });
    if (tpTabs.length > 0) {
      chrome.tabs.update(tpTabs[0].id, { url: shareUrl, active: true });
      chrome.windows.update(tpTabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: shareUrl });
    }

    // Auto-close popup after a moment
    setTimeout(() => window.close(), 800);
  });
}

document.addEventListener('DOMContentLoaded', init);
