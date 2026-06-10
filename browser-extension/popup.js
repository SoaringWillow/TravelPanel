const PLATFORMS = {
  'instagram.com':       { name: 'Instagram',   color: '#E1306C' },
  'youtube.com':         { name: 'YouTube',      color: '#FF0000' },
  'youtu.be':            { name: 'YouTube',      color: '#FF0000' },
  'xiaohongshu.com':     { name: 'Xiaohongshu', color: '#FF2442' },
  'xhslink.com':         { name: 'Xiaohongshu', color: '#FF2442' },
  'douyin.com':          { name: 'Douyin',       color: '#010101' },
  'tiktok.com':          { name: 'TikTok',       color: '#010101' },
  'bilibili.com':        { name: 'Bilibili',     color: '#00A1D6' },
  'weibo.com':           { name: 'Weibo',        color: '#E6162D' },
  'mp.weixin.qq.com':    { name: 'WeChat',       color: '#07C160' },
  'twitter.com':         { name: 'Twitter',      color: '#1DA1F2' },
  'x.com':               { name: 'X',            color: '#0f172a' },
  'maps.google.com':     { name: 'Google Maps',  color: '#4285F4' },
  'tripadvisor.com':     { name: 'TripAdvisor',  color: '#34E0A1' },
  'airbnb.com':          { name: 'Airbnb',       color: '#FF5A5F' },
};

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return info;
    }
  } catch {}
  return null;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 1) + '…';
}

function setSuccessState(btn) {
  btn.disabled = true;
  btn.classList.add('success');
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Clipped!
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    document.getElementById('page-title').textContent = 'Cannot access this tab.';
    return;
  }

  const url   = tab?.url   || '';
  const title = tab?.title || '';

  // ── Favicon ──
  const faviconEl = document.getElementById('favicon');
  if (url.startsWith('http')) {
    try {
      const hostname = new URL(url).hostname;
      faviconEl.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
      faviconEl.onerror = () => (faviconEl.style.display = 'none');
    } catch {
      faviconEl.style.display = 'none';
    }
  } else {
    faviconEl.style.display = 'none';
  }

  // ── Page info ──
  document.getElementById('page-title').textContent = truncate(title, 90) || 'Untitled page';
  document.getElementById('page-url').textContent   = truncate(url, 60);

  // ── Platform badge ──
  const platform = detectPlatform(url);
  if (platform) {
    const badge = document.getElementById('platform-badge');
    badge.textContent          = platform.name;
    badge.style.color          = platform.color;
    badge.style.backgroundColor = platform.color + '18';
    badge.style.borderColor    = platform.color + '40';
    badge.classList.remove('hidden');
  }

  // ── Non-clippable pages ──
  const clipBtn = document.getElementById('clip-btn');
  if (!url.startsWith('http')) {
    clipBtn.disabled = true;
    clipBtn.textContent = 'Cannot clip this page';
    return;
  }

  // ── Setup hint ──
  const { baseUrl = '' } = await chrome.storage.sync.get(['baseUrl']);
  const setupHint = document.getElementById('setup-hint');
  if (!baseUrl) setupHint.classList.remove('hidden');

  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Options button ──
  document.getElementById('options-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Clip button ──
  clipBtn.addEventListener('click', async () => {
    const { baseUrl = '' } = await chrome.storage.sync.get(['baseUrl']);
    const trimmed = baseUrl.replace(/\/$/, '');

    if (!trimmed) {
      setupHint.classList.remove('hidden');
      setupHint.classList.add('shake');
      setTimeout(() => setupHint.classList.remove('shake'), 300);
      return;
    }

    const shareUrl = `${trimmed}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    setSuccessState(clipBtn);
    chrome.tabs.create({ url: shareUrl });
    setTimeout(() => window.close(), 900);
  });
});
