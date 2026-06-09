const PLATFORMS = {
  'instagram.com':    { name: 'Instagram',   color: '#E1306C', bg: '#fce4ec', emoji: '📸' },
  'youtube.com':      { name: 'YouTube',     color: '#CC0000', bg: '#ffebee', emoji: '▶️' },
  'youtu.be':         { name: 'YouTube',     color: '#CC0000', bg: '#ffebee', emoji: '▶️' },
  'xiaohongshu.com':  { name: '小红书',       color: '#FF2442', bg: '#fce4ec', emoji: '📕' },
  'xhslink.com':      { name: '小红书',       color: '#FF2442', bg: '#fce4ec', emoji: '📕' },
  'douyin.com':       { name: '抖音',         color: '#161823', bg: '#f3f4f6', emoji: '🎵' },
  'bilibili.com':     { name: 'Bilibili',    color: '#00A1D6', bg: '#e3f2fd', emoji: '📺' },
  'tiktok.com':       { name: 'TikTok',      color: '#161823', bg: '#f3f4f6', emoji: '🎵' },
  'maps.google.com':  { name: 'Google Maps', color: '#4285F4', bg: '#e8f0fe', emoji: '🗺️' },
  'tripadvisor.com':  { name: 'TripAdvisor', color: '#34A853', bg: '#e6f9ee', emoji: '✈️' },
  'airbnb.com':       { name: 'Airbnb',      color: '#FF5A5F', bg: '#fce4ec', emoji: '🏠' },
  'booking.com':      { name: 'Booking',     color: '#003580', bg: '#e8effa', emoji: '🏨' },
  'twitter.com':      { name: 'Twitter/X',   color: '#000000', bg: '#f3f4f6', emoji: '🐦' },
  'x.com':            { name: 'Twitter/X',   color: '#000000', bg: '#f3f4f6', emoji: '🐦' },
};

const RESTRICTED_SCHEMES = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];

function detectPlatform(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    for (const [domain, info] of Object.entries(PLATFORMS)) {
      if (host === domain || host.endsWith('.' + domain)) return info;
    }
    return { name: host, color: '#6366f1', bg: '#eef2ff', emoji: '🌐' };
  } catch {
    return { name: 'Web', color: '#6366f1', bg: '#eef2ff', emoji: '🌐' };
  }
}

function isRestricted(url) {
  return RESTRICTED_SCHEMES.some(s => url.startsWith(s));
}

function buildShareUrl(base, url, title) {
  return `${base.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

function showSkeleton(show) {
  document.getElementById('skelTitle').style.display = show ? 'block' : 'none';
  document.getElementById('skelUrl').style.display  = show ? 'block' : 'none';
  document.getElementById('pageTitle').style.display = show ? 'none' : 'block';
  document.getElementById('pageUrl').style.display   = show ? 'none' : 'flex';
}

function setLoading(loading) {
  const btn = document.getElementById('clipBtn');
  const spinner = document.getElementById('btnSpinner');
  const pin = document.getElementById('btnPin');
  btn.disabled = loading;
  spinner.style.display = loading ? 'block' : 'none';
  pin.style.display = loading ? 'none' : 'inline';
}

async function init() {
  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: '' });

  // ── Settings button ──
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('goToSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('openApp').addEventListener('click', () => {
    if (travelpanelUrl) {
      chrome.tabs.create({ url: travelpanelUrl });
    } else {
      chrome.runtime.openOptionsPage();
    }
  });

  // ── Not configured ──
  if (!travelpanelUrl) {
    document.getElementById('notConfigured').style.display = 'flex';
    document.getElementById('pageCard').style.display = 'none';
    document.getElementById('clipBtn').style.display = 'none';
    return;
  }

  // ── Get current tab ──
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const url = tab.url;
  const title = tab.title || url;

  // ── Restricted page ──
  if (isRestricted(url)) {
    document.getElementById('restricted').style.display = 'flex';
    document.getElementById('pageCard').style.display = 'none';
    document.getElementById('clipBtn').disabled = true;
    document.getElementById('platformChip').style.display = 'none';
    return;
  }

  // ── Platform chip ──
  const platform = detectPlatform(url);
  const chip = document.getElementById('platformChip');
  chip.style.display = 'inline-flex';
  chip.textContent = `${platform.emoji} ${platform.name}`;
  chip.style.background = platform.bg;
  chip.style.color = platform.color;

  // ── Page info ──
  showSkeleton(false);
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrlText').textContent = url;

  // ── Favicon ──
  if (tab.favIconUrl) {
    const fav = document.getElementById('favIcon');
    fav.src = tab.favIconUrl;
    fav.classList.add('visible');
  }

  // ── og:image thumbnail (best-effort) ──
  try {
    const [{ result: ogImage }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.querySelector('meta[property="og:image"]')?.content ?? null,
    });
    if (ogImage) {
      const img = document.getElementById('thumbnail');
      img.src = ogImage;
      img.addEventListener('load', () => img.classList.add('visible'));
      img.addEventListener('error', () => {});
    }
  } catch (_) {
    // scripting blocked on this page — skip thumbnail
  }

  // ── Enable clip button ──
  const clipBtn = document.getElementById('clipBtn');
  clipBtn.disabled = false;

  clipBtn.addEventListener('click', async () => {
    setLoading(true);

    const shareUrl = buildShareUrl(travelpanelUrl, url, title);

    // Brief visual feedback, then open share page
    await new Promise(r => setTimeout(r, 350));

    document.getElementById('pageCard').style.display = 'none';
    document.getElementById('platformChip').style.display = 'none';
    clipBtn.style.display = 'none';
    document.getElementById('successState').style.display = 'flex';

    chrome.tabs.create({ url: shareUrl });

    setTimeout(() => window.close(), 1400);
  });
}

// Start with skeleton visible, enable once tab info loads
showSkeleton(true);
init().catch(console.error);
