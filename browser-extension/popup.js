'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_PATTERNS = [
  { id: 'youtube',     label: 'YouTube',    re: /youtube\.com|youtu\.be/ },
  { id: 'instagram',   label: 'Instagram',  re: /instagram\.com/ },
  { id: 'xiaohongshu', label: '小红书',      re: /xiaohongshu\.com|xhslink\.com/ },
  { id: 'tiktok',      label: 'TikTok',     re: /tiktok\.com|douyin\.com/ },
  { id: 'twitter',     label: 'X / Twitter',re: /twitter\.com|x\.com/ },
  { id: 'weibo',       label: 'Weibo',      re: /weibo\.com/ },
  { id: 'bilibili',    label: 'Bilibili',   re: /bilibili\.com/ },
];

const NON_CLIPPABLE = /^(chrome:|chrome-extension:|edge:|about:|moz-extension:|brave:)/;

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.re.test(url)) return p;
  }
  return null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('appUrl', (data) => {
      resolve((data.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    document.getElementById('footerText').textContent = 'Could not read current tab';
    return;
  }

  const url = tab?.url || '';
  const title = (tab?.title || 'Untitled page').trim();

  // Favicon
  const faviconEl = document.getElementById('favicon');
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
  }

  // Title + domain
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = extractDomain(url);

  // Platform badge
  const platform = detectPlatform(url);
  if (platform) {
    const badge = document.getElementById('platformBadge');
    badge.textContent = platform.label;
    badge.setAttribute('data-platform', platform.id);
    badge.classList.remove('hidden');
  }

  const clipBtn = document.getElementById('clipBtn');
  const warningMsg = document.getElementById('warningMsg');

  // Disable for non-clippable pages
  if (!url || NON_CLIPPABLE.test(url)) {
    clipBtn.disabled = true;
    warningMsg.textContent = 'Browser pages cannot be clipped — navigate to a travel site first.';
    warningMsg.classList.remove('hidden');
    document.getElementById('footerText').textContent = 'Navigate to a travel page to clip it';
    return;
  }

  // Clip button
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;

    const appUrl = await getAppUrl();
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    // Show success animation briefly, then open tab
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('successState').classList.remove('hidden');

    setTimeout(() => {
      chrome.tabs.create({ url: shareUrl });
      window.close();
    }, 700);
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
