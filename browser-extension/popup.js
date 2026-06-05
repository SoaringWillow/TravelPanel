// Platform detection — mirrors lib/parse-url.ts
const PLATFORMS = {
  xiaohongshu: { label: 'Xiaohongshu', color: '#ff2442' },
  douyin:      { label: 'Douyin',       color: '#161823' },
  bilibili:    { label: 'Bilibili',     color: '#00aeec' },
  wechat:      { label: 'WeChat',       color: '#07c160' },
  instagram:   { label: 'Instagram',    color: '#e1306c' },
  youtube:     { label: 'YouTube',      color: '#ff0000' },
  tiktok:      { label: 'TikTok',      color: '#161823' },
  twitter:     { label: 'Twitter / X',  color: '#000000' },
  other:       { label: 'Web',          color: '#6b7280' },
};

function detectPlatform(url) {
  if (/xiaohongshu\.com|xhslink\.com/.test(url)) return 'xiaohongshu';
  if (/douyin\.com/.test(url))                   return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url))         return 'bilibili';
  if (/wechat\.com|weixin\.qq\.com/.test(url))   return 'wechat';
  if (/instagram\.com/.test(url))                return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url))        return 'youtube';
  if (/tiktok\.com/.test(url))                   return 'tiktok';
  if (/twitter\.com|x\.com/.test(url))           return 'twitter';
  return 'other';
}

function isClippable(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
      resolve((appUrl || '').replace(/\/$/, ''));
    });
  });
}

function show(id)  { document.getElementById(id).style.display = ''; }
function hide(id)  { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl    = document.getElementById('page-title');
  const urlEl      = document.getElementById('page-url');
  const badgeEl    = document.getElementById('platform-badge');
  const clipBtn    = document.getElementById('clipBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  // ── Get current tab ──────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl   = tab?.url   ?? '';
  const pageTitle = tab?.title ?? 'Untitled';

  if (!isClippable(pageUrl)) {
    hide('main-state');
    show('error-state');
    return;
  }

  // ── Populate page info ───────────────────────────────────────────────────
  const platform     = detectPlatform(pageUrl);
  const platformInfo = PLATFORMS[platform];

  titleEl.textContent = pageTitle;
  urlEl.textContent   = pageUrl;

  if (platform !== 'other') {
    badgeEl.textContent              = platformInfo.label;
    badgeEl.style.backgroundColor    = platformInfo.color;
    badgeEl.style.display            = 'inline-block';
  }

  // ── Settings button ──────────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // ── Clip button ──────────────────────────────────────────────────────────
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled    = true;
    clipBtn.innerHTML   = '<span style="animation:spin 0.8s linear infinite;display:inline-block">⏳</span> Opening…';

    const appUrl = await getAppUrl();

    if (!appUrl) {
      // No app URL configured — open options page
      chrome.runtime.openOptionsPage();
      window.close();
      return;
    }

    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    // Open TravelPanel share page in a new tab
    chrome.tabs.create({ url: shareUrl });

    // Show brief success feedback, then close
    hide('main-state');
    show('success-state');
    setTimeout(() => window.close(), 1200);
  });
});
