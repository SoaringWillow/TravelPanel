const DEFAULT_URL = 'https://travelpanel.vercel.app';

const PLATFORM_MAP = {
  'instagram.com': { label: 'Instagram', color: '#e1306c', bg: '#fce4ec' },
  'youtube.com': { label: 'YouTube', color: '#ff0000', bg: '#ffebee' },
  'youtu.be': { label: 'YouTube', color: '#ff0000', bg: '#ffebee' },
  'xiaohongshu.com': { label: 'Xiaohongshu', color: '#fe2c55', bg: '#fce4ec' },
  'xhs.com': { label: 'Xiaohongshu', color: '#fe2c55', bg: '#fce4ec' },
  'tiktok.com': { label: 'TikTok', color: '#010101', bg: '#f5f5f5' },
  'pinterest.com': { label: 'Pinterest', color: '#e60023', bg: '#ffebee' },
  'twitter.com': { label: 'X / Twitter', color: '#000000', bg: '#f5f5f5' },
  'x.com': { label: 'X / Twitter', color: '#000000', bg: '#f5f5f5' },
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const [key, val] of Object.entries(PLATFORM_MAP)) {
      if (hostname.includes(key)) return val;
    }
  } catch (_) { /* ignore */ }
  return null;
}

async function init() {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');

  document.getElementById('open-app').href = travelpanelUrl;
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const url = tab?.url ?? '';
  const title = tab?.title ?? '';

  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const clipBtn = document.getElementById('clip-btn');
  const btnLabel = document.getElementById('btn-label');
  const chipEl = document.getElementById('platform-chip');

  // Restricted pages (browser-internal URLs)
  const restricted = !url
    || url.startsWith('chrome://')
    || url.startsWith('chrome-extension://')
    || url.startsWith('about:')
    || url.startsWith('edge://')
    || url.startsWith('moz-extension://');

  if (restricted) {
    titleEl.textContent = 'Navigate to a travel page to clip it';
    titleEl.classList.add('empty');
    urlEl.textContent = 'Instagram, YouTube, Xiaohongshu, or any travel blog';
    clipBtn.disabled = true;
    btnLabel.textContent = 'Nothing to clip here';
    return;
  }

  // Show platform chip
  const platform = detectPlatform(url);
  if (platform) {
    chipEl.innerHTML = `
      <span class="platform-chip" style="color:${platform.color};background:${platform.bg}">
        ${platform.label}
      </span>`;
  }

  titleEl.textContent = title || url;
  urlEl.textContent = url;

  clipBtn.disabled = false;
  clipBtn.addEventListener('click', () => {
    const shareUrl = `${travelpanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });
}

init();
