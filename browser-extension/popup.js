'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORM_COLORS = {
  wechat:       '#07C160',
  xiaohongshu:  '#FF2442',
  douyin:       '#fe2c55',
  bilibili:     '#00AEEC',
  other:        '#6366f1',
};

const PLATFORM_LABELS = {
  wechat:       'WeChat',
  xiaohongshu:  '小红书',
  douyin:       '抖音 / TikTok',
  bilibili:     'Bilibili',
  other:        'Web',
};

const PLATFORM_EMOJIS = {
  wechat:       '💬',
  xiaohongshu:  '📕',
  douyin:       '🎵',
  bilibili:     '📺',
  other:        '🌐',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin|wechat\.com/.test(url)) return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com|redbook/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com|tiktok\.com/.test(url)) return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili';
  return 'other';
}

// ── Travel content heuristic ────────────────────────────────────────────────

const TRAVEL_KEYWORDS = [
  'travel', 'trip', 'hotel', 'hostel', 'restaurant', 'cafe', 'beach',
  'mountain', 'city', 'tour', 'guide', 'destination', 'itinerary', 'flight',
  'booking', 'hiking', 'sightseeing', 'explore', 'adventure', 'vacation',
  'holiday', 'backpack', 'resort', 'museum', 'temple', 'landmark', 'hidden gem',
  '旅行', '旅游', '景点', '美食', '攻略', '打卡', '酒店', '民宿', '路线',
];

function isTravelContent(title, url) {
  const text = (title + ' ' + url).toLowerCase();
  return TRAVEL_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

// ── Initialise popup ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Wire settings buttons
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  document.getElementById('footer-link').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const { panelUrl } = await chrome.storage.sync.get(['panelUrl']);

  if (!panelUrl) {
    show('setup-prompt');
    document.getElementById('setup-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  // Get current tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    show('error-state');
    document.getElementById('error-msg').textContent = 'Unable to read current tab.';
    return;
  }

  if (!tab || !tab.url) {
    show('error-state');
    document.getElementById('error-msg').textContent = 'Cannot clip this page (restricted URL).';
    return;
  }

  renderPage(tab, panelUrl);
});

// ── Render the page preview ─────────────────────────────────────────────────

function renderPage(tab, panelUrl) {
  const url     = tab.url || '';
  const title   = tab.title || 'Untitled page';
  const platform = detectPlatform(url);
  const domain   = getDomain(url);

  // Favicon
  const faviconEl = document.getElementById('favicon');
  const faviconFallback = document.getElementById('favicon-fallback');
  faviconEl.src = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`;
  faviconEl.onerror = () => {
    faviconEl.style.display = 'none';
    faviconFallback.style.display = '';
  };

  // Title
  const displayTitle = title.length > 80 ? title.slice(0, 80) + '…' : title;
  document.getElementById('page-title').textContent = displayTitle;

  // Domain
  document.getElementById('page-domain').textContent = domain;

  // Platform badge
  const badgeEl = document.getElementById('platform-badge');
  const color    = PLATFORM_COLORS[platform];
  badgeEl.textContent = `${PLATFORM_EMOJIS[platform]} ${PLATFORM_LABELS[platform]}`;
  badgeEl.style.backgroundColor = color + '1a'; // ~10% opacity
  badgeEl.style.color = platform === 'douyin' ? '#fe2c55' : color;
  badgeEl.style.border = `1px solid ${color}33`;

  // Travel signal
  if (isTravelContent(title, url)) {
    show('travel-signal');
  }

  // Show main content
  show('main-content');

  // Wire save button
  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', () => {
    saveBtn.classList.add('saving');
    saveBtn.textContent = 'Opening TravelPanel…';

    const shareUrl =
      panelUrl.replace(/\/$/, '') +
      '/share?url=' + encodeURIComponent(url) +
      '&title=' + encodeURIComponent(title);

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });
}
