'use strict';

const PLATFORMS = [
  { domains: ['instagram.com'], name: 'Instagram', color: '#E1306C' },
  { domains: ['youtube.com', 'youtu.be'], name: 'YouTube', color: '#FF0000' },
  { domains: ['xiaohongshu.com', 'xhslink.com'], name: '小红书', color: '#FF2442' },
  { domains: ['x.com', 'twitter.com'], name: 'Twitter/X', color: '#1D9BF0' },
  { domains: ['tiktok.com'], name: 'TikTok', color: '#00c7be' },
  { domains: ['bilibili.com'], name: 'Bilibili', color: '#00a1d6' },
  { domains: ['douyin.com'], name: '抖音', color: '#5ac8d8' },
  { domains: ['weibo.com'], name: 'Weibo', color: '#E6162D' },
  { domains: ['pinterest.com'], name: 'Pinterest', color: '#E60023' },
  { domains: ['tripadvisor.com'], name: 'TripAdvisor', color: '#34E0A1' },
  { domains: ['lonelyplanet.com'], name: 'Lonely Planet', color: '#FF6B2B' },
  { domains: ['travelandleisure.com'], name: 'T+L', color: '#9b59b6' },
];

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const p of PLATFORMS) {
      if (p.domains.some(d => host === d || host.endsWith('.' + d))) return p;
    }
  } catch {}
  return { name: 'Web', color: '#6366f1' };
}

function isClippable(url) {
  if (!url) return false;
  const blocked = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://'];
  return !blocked.some(p => url.startsWith(p));
}

const ALL_STATES = ['state-loading', 'state-setup', 'state-error', 'state-main'];

function showState(id) {
  ALL_STATES.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Persistent header/footer listeners
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  document.getElementById('open-app').addEventListener('click', async () => {
    const { travelpanel_url: url } = await chrome.storage.sync.get('travelpanel_url');
    await chrome.tabs.create({ url: url || chrome.runtime.getURL('options.html') });
    window.close();
  });

  document.getElementById('goto-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Load config
  const { travelpanel_url: appUrl } = await chrome.storage.sync.get('travelpanel_url');

  if (!appUrl) {
    showState('state-setup');
    return;
  }

  // Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showState('state-error');
    return;
  }

  if (!tab || !isClippable(tab.url)) {
    showState('state-error');
    return;
  }

  // Platform badge
  const platform = detectPlatform(tab.url);
  const badge = document.getElementById('platform-badge');
  badge.textContent = platform.name;
  badge.style.color = platform.color;
  badge.style.borderColor = platform.color + '55';
  badge.style.backgroundColor = platform.color + '18';

  // Page title
  const title = tab.title || 'Untitled Page';
  document.getElementById('page-title').textContent = title;

  // Display hostname
  let displayHost = tab.url;
  try { displayHost = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}
  document.getElementById('page-url').textContent = displayHost;

  // Favicon
  if (tab.favIconUrl) {
    const img = document.getElementById('favicon');
    const fallback = document.getElementById('favicon-fallback');
    img.onload = () => {
      img.style.display = 'block';
      fallback.style.display = 'none';
    };
    img.src = tab.favIconUrl;
  }

  showState('state-main');

  // Clip action
  document.getElementById('clip-btn').addEventListener('click', async () => {
    const btn = document.getElementById('clip-btn');
    const label = document.getElementById('clip-label');
    btn.disabled = true;
    btn.classList.add('clipping');
    label.textContent = 'Opening TravelPanel…';

    const base = appUrl.replace(/\/$/, '');
    const shareUrl = `${base}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl });
    window.close();
  });
});
