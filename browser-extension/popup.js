// ─── Platform detection (mirrors lib/parse-url.ts) ────────────────────────

const PLATFORMS = [
  { id: 'youtube',      pattern: /youtube\.com|youtu\.be/,                  label: 'YouTube',    color: '#FF0000' },
  { id: 'instagram',    pattern: /instagram\.com/,                           label: 'Instagram',  color: '#E1306C' },
  { id: 'xiaohongshu',  pattern: /xiaohongshu\.com|xhslink\.com|rednote\.com/, label: '小红书',   color: '#FF2442' },
  { id: 'wechat',       pattern: /weixin\.qq\.com|mp\.weixin\.qq\.com/,      label: 'WeChat',     color: '#07C160' },
  { id: 'douyin',       pattern: /douyin\.com/,                              label: 'Douyin',     color: '#161722' },
  { id: 'tiktok',       pattern: /tiktok\.com/,                              label: 'TikTok',     color: '#161722' },
  { id: 'bilibili',     pattern: /bilibili\.com/,                            label: 'Bilibili',   color: '#00A1D6' },
  { id: 'tripadvisor',  pattern: /tripadvisor\./,                            label: 'TripAdvisor',color: '#34E0A1' },
  { id: 'yelp',         pattern: /yelp\.com/,                                label: 'Yelp',       color: '#D32323' },
  { id: 'googlemaps',   pattern: /google\.com\/maps|maps\.google\./,         label: 'Google Maps',color: '#4285F4' },
  { id: 'airbnb',       pattern: /airbnb\./,                                 label: 'Airbnb',     color: '#FF5A5F' },
];

function detectPlatform(url) {
  try {
    const { hostname, href } = new URL(url);
    for (const p of PLATFORMS) {
      if (p.pattern.test(hostname) || p.pattern.test(href)) return p;
    }
  } catch { /* ignore */ }
  return { id: 'web', label: 'Web', color: '#4F46E5' };
}

// ─── DOM refs ──────────────────────────────────────────────────────────────

const viewMain     = document.getElementById('view-main');
const viewSuccess  = document.getElementById('view-success');
const elTitle      = document.getElementById('page-title');
const elUrl        = document.getElementById('page-url');
const elChip       = document.getElementById('platform-chip');
const btnClip      = document.getElementById('btn-clip');
const btnSettings  = document.getElementById('btn-settings');
const linkOpenApp  = document.getElementById('link-open-app');

// ─── Main ─────────────────────────────────────────────────────────────────

async function init() {
  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || 'Untitled page';

  // Get configured TravelPanel URL
  const { travelPanelUrl = 'https://travel-panel.vercel.app' } =
    await chrome.storage.sync.get('travelPanelUrl');

  const base = travelPanelUrl.replace(/\/$/, '');

  // Skip chrome:// and extension pages
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    elTitle.textContent = 'Navigate to a travel page first';
    elTitle.classList.add('loading');
    elUrl.textContent = '';
    return;
  }

  // Populate page info
  elTitle.textContent = title;
  elUrl.textContent   = url.length > 60 ? url.slice(0, 57) + '…' : url;

  // Platform chip
  const platform = detectPlatform(url);
  elChip.textContent         = platform.label;
  elChip.style.backgroundColor = platform.color;
  elChip.style.display       = 'inline-flex';

  // Open app link
  linkOpenApp.href = base;

  // Enable clip button
  btnClip.disabled = false;

  // Clip handler
  btnClip.addEventListener('click', async () => {
    btnClip.disabled = true;
    const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    showSuccess();
    await chrome.tabs.create({ url: shareUrl });
    setTimeout(() => window.close(), 1200);
  });

  // Settings
  btnSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function showSuccess() {
  viewMain.style.display    = 'none';
  viewSuccess.style.display = 'flex';
}

init().catch((err) => {
  elTitle.textContent = 'Something went wrong';
  elTitle.classList.add('loading');
  console.error('[TravelPanel Clipper]', err);
});
