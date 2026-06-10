'use strict';

const DEFAULT_URL = 'http://localhost:3000';

const PLATFORM_META = {
  wechat:       { label: 'WeChat',          badge: 'badge-wechat',      icon: '💬' },
  xiaohongshu:  { label: 'Little Red Book', badge: 'badge-xiaohongshu', icon: '📕' },
  douyin:       { label: 'Douyin / TikTok', badge: 'badge-douyin',      icon: '🎵' },
  bilibili:     { label: 'Bilibili',        badge: 'badge-bilibili',    icon: '📺' },
  youtube:      { label: 'YouTube',         badge: 'badge-youtube',     icon: '▶️' },
  instagram:    { label: 'Instagram',       badge: 'badge-instagram',   icon: '📸' },
  other:        { label: 'Web',             badge: 'badge-other',       icon: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin/.test(url))           return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com/.test(url))        return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com/.test(url))           return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url))                return 'bilibili';
  if (/youtube\.com|youtu\.be/.test(url))               return 'youtube';
  if (/instagram\.com/.test(url))                       return 'instagram';
  return 'other';
}

function getSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL }, resolve)
  );
}

function truncateUrl(url, max = 52) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const clipBtn     = $('clipBtn');
  const clipText    = $('clipText');
  const clipIcon    = $('clipIcon');
  const spinner     = $('spinner');
  const statusMsg   = $('statusMsg');
  const pageTitle   = $('pageTitle');
  const pageUrl     = $('pageUrl');
  const platformBadge = $('platformBadge');
  const faviconWrap = $('faviconWrap');
  const settingsBtn = $('settingsBtn');
  const shortcutHint = $('shortcutHint');

  // Load current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || url || 'Unknown page';

  // Populate page info
  pageTitle.textContent = title;
  pageUrl.textContent   = truncateUrl(url);

  // Platform badge
  const platform = detectPlatform(url);
  const meta = PLATFORM_META[platform];
  platformBadge.textContent = meta.label;
  platformBadge.className   = `platform-badge ${meta.badge}`;

  // Favicon
  if (tab?.favIconUrl) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.onerror = () => { faviconWrap.textContent = meta.icon; };
    faviconWrap.innerHTML = '';
    faviconWrap.appendChild(img);
  } else {
    faviconWrap.textContent = meta.icon;
  }

  // Show keyboard shortcut hint (Mac vs others)
  const isMac = navigator.platform.startsWith('Mac');
  shortcutHint.innerHTML = `Shortcut: <kbd>${isMac ? '⌘⇧S' : 'Ctrl+Shift+S'}</kbd>`;

  // Block non-clippable pages
  const blocked = !url || /^(chrome|chrome-extension|about|edge|moz-extension):/.test(url);
  if (blocked) {
    clipBtn.disabled = true;
    statusMsg.textContent = 'This page cannot be clipped.';
  }

  // Settings button
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Clip button
  clipBtn.addEventListener('click', async () => {
    if (clipBtn.disabled) return;

    const { travelpanelUrl } = await getSettings();
    const base      = travelpanelUrl.replace(/\/$/, '');
    const importUrl = `${base}?import=${encodeURIComponent(url)}`;

    // Loading state
    clipBtn.disabled      = true;
    clipText.textContent  = 'Opening…';
    clipIcon.textContent  = '';
    spinner.style.display = 'block';
    statusMsg.textContent = '';
    statusMsg.className   = 'status';

    try {
      await chrome.tabs.create({ url: importUrl });

      // Success
      spinner.style.display = 'none';
      clipIcon.textContent  = '✓';
      clipText.textContent  = 'Opened in TravelPanel';
      clipBtn.classList.add('success');
      statusMsg.textContent = 'Review extraction in the new tab.';
      statusMsg.className   = 'status success';

      setTimeout(() => window.close(), 1400);
    } catch (err) {
      spinner.style.display = 'none';
      clipBtn.disabled      = false;
      clipIcon.textContent  = '📌';
      clipText.textContent  = 'Clip to TravelPanel';
      statusMsg.textContent = 'Could not open tab. Check your settings.';
      statusMsg.className   = 'status error';
    }
  });
});
