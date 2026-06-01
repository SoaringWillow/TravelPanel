'use strict';

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const PLATFORM_PATTERNS = {
  xiaohongshu: [/xiaohongshu\.com/, /xhslink\.com/, /xhs\.link/],
  instagram:   [/instagram\.com/],
  youtube:     [/youtube\.com/, /youtu\.be/],
  tiktok:      [/tiktok\.com/, /vm\.tiktok\.com/],
  douyin:      [/douyin\.com/, /iesdouyin\.com/],
  bilibili:    [/bilibili\.com/, /b23\.tv/],
  weibo:       [/weibo\.com/, /weibo\.cn/],
  twitter:     [/twitter\.com/, /x\.com/],
  maps:        [/maps\.google\.com/, /goo\.gl\/maps/, /maps\.apple\.com/],
};

const PLATFORM_LABELS = {
  xiaohongshu: '小红书',
  instagram:   'Instagram',
  youtube:     'YouTube',
  tiktok:      'TikTok',
  douyin:      '抖音',
  bilibili:    'Bilibili',
  weibo:       '微博',
  twitter:     'X / Twitter',
  maps:        'Maps',
};

function detectPlatform(url) {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (patterns.some((re) => re.test(url))) return platform;
  }
  return null;
}

function truncateUrl(url, max = 42) {
  try {
    const u = new URL(url);
    const display = u.hostname.replace(/^www\./, '') + u.pathname;
    return display.length > max ? display.slice(0, max - 1) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + '…' : url;
  }
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
      resolve(appUrl.trim() || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const appUrl = await getAppUrl();

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const url   = tab.url   || '';
  const title = tab.title || '';

  // Populate page info
  document.getElementById('pageTitle').textContent = title || '(no title)';
  document.getElementById('pageUrl').textContent   = truncateUrl(url);

  // Favicon
  if (tab.favIconUrl) {
    const faviconEl = document.getElementById('pageFavicon');
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.onerror = () => {}; // keep SVG placeholder on error
    faviconEl.innerHTML = '';
    faviconEl.appendChild(img);
  }

  // Platform detection
  const platform = detectPlatform(url);
  if (platform) {
    const platformRow  = document.getElementById('platformRow');
    const platformBadge = document.getElementById('platformBadge');
    platformBadge.textContent = PLATFORM_LABELS[platform] || platform;
    platformRow.style.display = 'flex';
  }

  // Check for non-clippable URLs
  const isClippable = url.startsWith('http://') || url.startsWith('https://');
  const saveBtn = document.getElementById('saveBtn');

  if (!isClippable) {
    saveBtn.disabled = true;
    saveBtn.title = 'Cannot clip this page';
    document.getElementById('destHint')?.remove();
  }

  // Save button handler
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Opening…';

    const encodedUrl   = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const shareUrl     = `${appUrl}/share?url=${encodedUrl}&title=${encodedTitle}`;

    // Try to find an existing TravelPanel tab to reuse
    const allTabs = await chrome.tabs.query({});
    const existingTab = allTabs.find((t) => t.url && t.url.startsWith(appUrl));

    if (existingTab) {
      await chrome.tabs.update(existingTab.id, {
        active: true,
        url: shareUrl,
      });
      await chrome.windows.update(existingTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: shareUrl });
    }

    // Show success state
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('successState').style.display = 'block';

    setTimeout(() => window.close(), 1400);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});
