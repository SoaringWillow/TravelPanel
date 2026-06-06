// ─── Platform detection (mirrors lib/parse-url.ts + extended for browser context) ─

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin/i.test(url)) return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com/i.test(url)) return 'douyin';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/bilibili\.com|b23\.tv/i.test(url)) return 'bilibili';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/tripadvisor\./i.test(url)) return 'tripadvisor';
  if (/maps\.google\.|google\.com\/maps/i.test(url)) return 'maps';
  if (/booking\.com/i.test(url)) return 'booking';
  if (/airbnb\./i.test(url)) return 'airbnb';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: '小红书',
  douyin: 'Douyin',
  tiktok: 'TikTok',
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tripadvisor: 'TripAdvisor',
  maps: 'Google Maps',
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  tiktok: '#010101',
  bilibili: '#00AEEC',
  youtube: '#FF0000',
  instagram: '#E1306C',
  tripadvisor: '#00AF87',
  maps: '#4285F4',
  booking: '#003580',
  airbnb: '#FF5A5F',
  other: '#6366f1',
};

// Platforms TravelPanel is designed to clip from
const TRAVEL_PLATFORMS = new Set([
  'wechat', 'xiaohongshu', 'douyin', 'tiktok', 'bilibili',
  'youtube', 'instagram', 'tripadvisor', 'maps', 'booking', 'airbnb',
]);

// ─── Keyboard shortcut hint (Mac vs PC) ─────────────────────────────────────

function getShortcutHint() {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return isMac ? '⌘⇧T' : 'Alt+T';
}

// ─── Truncate URL for display ─────────────────────────────────────────────────

function formatUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    const short = parsed.hostname + (path.length > 30 ? path.slice(0, 30) + '…' : path);
    return short;
  } catch {
    return url.length > 60 ? url.slice(0, 60) + '…' : url;
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? '';
    const title = tab?.title ?? '';

    const stored = await chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' });
    const baseUrl = stored.travelPanelUrl.replace(/\/$/, '');

    const platform = detectPlatform(url);
    const isTravelContent = TRAVEL_PLATFORMS.has(platform);
    const isOnTravelPanel = url.startsWith(baseUrl);

    // ── Platform badge ──────────────────────────────────────────────────────
    const badge = document.getElementById('platformBadge');
    badge.textContent = PLATFORM_LABELS[platform] ?? 'Web';
    badge.style.backgroundColor = PLATFORM_COLORS[platform] ?? '#6366f1';

    // ── Travel content hint ─────────────────────────────────────────────────
    if (isTravelContent) {
      document.getElementById('travelHint').style.display = 'flex';
    }

    // ── Page info ───────────────────────────────────────────────────────────
    const titleEl = document.getElementById('pageTitle');
    const urlEl = document.getElementById('pageUrl');
    titleEl.textContent = title || '(no title)';
    urlEl.textContent = formatUrl(url);

    // ── Clip button ─────────────────────────────────────────────────────────
    const clipBtn = document.getElementById('clipBtn');
    const clipHint = document.getElementById('clipHint');
    const clipLabel = document.getElementById('clipBtnLabel');

    if (isOnTravelPanel) {
      // User is already in TravelPanel — show a friendly state
      clipBtn.disabled = true;
      document.getElementById('clipBtn').querySelector('.clip-icon').textContent = '🗺';
      clipLabel.textContent = 'You\'re already in TravelPanel';
      clipHint.textContent = 'Browse to a travel page to clip it';
    } else {
      // Add travel platform styling to button
      if (isTravelContent) {
        clipBtn.classList.add('is-travel');
      }

      clipBtn.addEventListener('click', async () => {
        const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        await chrome.tabs.create({ url: shareUrl });
        window.close();
      });

      clipHint.textContent = isTravelContent
        ? '✨ Great find! Opens the save dialog in a new tab'
        : 'Opens the save dialog in a new tab';
    }

    // ── Keyboard shortcut hint ─────────────────────────────────────────────
    document.getElementById('kbdShortcut').textContent = getShortcutHint();

    // ── Settings button ─────────────────────────────────────────────────────
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

  } catch (err) {
    // Gracefully handle any errors (e.g., restricted pages like chrome://)
    const titleEl = document.getElementById('pageTitle');
    const clipBtn = document.getElementById('clipBtn');
    const clipLabel = document.getElementById('clipBtnLabel');

    titleEl.textContent = 'This page cannot be clipped';
    clipBtn.disabled = true;
    document.getElementById('clipBtn').querySelector('.clip-icon').textContent = '🚫';
    clipLabel.textContent = 'Cannot clip browser pages';
    document.getElementById('clipHint').textContent = 'Navigate to a travel site to clip it';
  }
}

document.addEventListener('DOMContentLoaded', init);
