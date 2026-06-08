// ─── Platform detection ─────────────────────────────────────────────────────

const PLATFORMS = [
  { match: ['instagram.com'],                      name: 'Instagram',   emoji: '📸', color: '#e1306c' },
  { match: ['youtube.com', 'youtu.be'],            name: 'YouTube',     emoji: '▶️', color: '#ff0000' },
  { match: ['xiaohongshu.com', 'xhslink.com'],     name: 'Xiaohongshu', emoji: '📕', color: '#ff2d4b' },
  { match: ['tiktok.com', 'douyin.com'],           name: 'TikTok',      emoji: '🎵', color: '#69c9d0' },
  { match: ['bilibili.com', 'b23.tv'],             name: 'Bilibili',    emoji: '📺', color: '#00a1d6' },
  { match: ['weixin.qq.com', 'mp.weixin.qq.com'],  name: 'WeChat',      emoji: '💬', color: '#07c160' },
  { match: ['twitter.com', 'x.com'],               name: 'X / Twitter', emoji: '🐦', color: '#1da1f2' },
  { match: ['pinterest.com'],                      name: 'Pinterest',   emoji: '📌', color: '#e60023' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.match.some(domain => url.includes(domain))) return p;
  }
  return { name: 'Web', emoji: '🌐', color: '#6366f1' };
}

function truncateUrl(url, max = 48) {
  try {
    const u = new URL(url);
    const clean = u.hostname + u.pathname;
    return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + '…' : url;
  }
}

// ─── DOM refs ────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const elTitle       = $('pageTitle');
const elUrl         = $('pageUrl');
const elPlatformBadge = $('platformBadge');
const elPlatformEmoji = $('platformEmoji');
const elPlatformName  = $('platformName');
const elClipBtn     = $('clipBtn');
const elMain        = $('mainContent');
const elSuccess     = $('successState');
const elSuccessSub  = $('successSubtitle');
const elOpenLink    = $('openTravelPanel');
const elNoConfig    = $('noConfigAlert');
const elSettingsBtn = $('settingsBtn');
const elOpenSettingsLink = $('openSettingsLink');

// ─── Init ─────────────────────────────────────────────────────────────────────

let currentUrl   = '';
let currentTitle = '';
let travelPanelUrl = '';

async function init() {
  // Load settings
  const stored = await chrome.storage.sync.get(['travelPanelUrl']);
  travelPanelUrl = (stored.travelPanelUrl || '').replace(/\/$/, '');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl   = tab?.url   || '';
  currentTitle = tab?.title || 'Untitled Page';

  renderPagePreview();
  renderConfigState();
}

function renderPagePreview() {
  elTitle.textContent = currentTitle;
  elUrl.textContent   = truncateUrl(currentUrl);

  const platform = detectPlatform(currentUrl);
  elPlatformEmoji.textContent = platform.emoji;
  elPlatformName.textContent  = platform.name;
  elPlatformBadge.style.borderColor = platform.color + '55';
  elPlatformBadge.style.color       = platform.color;
}

function renderConfigState() {
  const ready = !!travelPanelUrl && !!currentUrl;
  elClipBtn.disabled = !ready;

  if (!travelPanelUrl) {
    elNoConfig.classList.remove('hidden');
  } else {
    elNoConfig.classList.add('hidden');
  }
}

// ─── Clip handler ─────────────────────────────────────────────────────────────

elClipBtn.addEventListener('click', async () => {
  if (!travelPanelUrl || !currentUrl) return;

  const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(currentTitle)}`;

  // Open TravelPanel share page in new tab
  chrome.tabs.create({ url: shareUrl });

  // Show success state
  elMain.classList.add('hidden');
  elSuccess.classList.remove('hidden');
  elSuccessSub.textContent = 'Opening TravelPanel…';
  elOpenLink.href = travelPanelUrl;

  // Self-close after short delay
  setTimeout(() => window.close(), 1400);
});

// ─── Settings nav ─────────────────────────────────────────────────────────────

elSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elOpenSettingsLink?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init().catch(console.error);
