'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection (mirrors lib/parse-url.ts)
function detectPlatform(url) {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

const PLATFORM_META = {
  wechat:      { label: 'WeChat',          color: '#07C160', emoji: '💬' },
  xiaohongshu: { label: '小红书',           color: '#FF2442', emoji: '📕' },
  douyin:      { label: 'Douyin / TikTok', color: '#2d2d2d', emoji: '🎵' },
  bilibili:    { label: 'Bilibili',         color: '#00AEEC', emoji: '📺' },
  other:       { label: 'Web',             color: '#6366F1', emoji: '🌐' },
};

const TRAVEL_KEYWORDS = [
  'travel', 'trip', 'tour', 'hotel', 'resort', 'restaurant', 'beach', 'mountain',
  'city', 'destination', 'itinerary', 'guide', 'visit', 'explore', 'discover',
  'food', 'cafe', 'bar', 'attraction', 'museum', 'park', 'hike', 'adventure',
  '旅行', '旅游', '美食', '景点', '酒店', '攻略', '打卡',
];

function looksLikeTravel(title, url) {
  const text = (title + ' ' + url).toLowerCase();
  return TRAVEL_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
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

function renderPagePreview(tab, appUrl) {
  const { url, title } = tab;
  const platform = detectPlatform(url);
  const meta = PLATFORM_META[platform];
  const isTravel = looksLikeTravel(title || '', url);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || '');

  const nonTravelWarning = !isTravel
    ? `<div class="non-travel-notice">
        <span>⚠️</span>
        <span>This page may not be travel content, but you can still clip it — AI will extract whatever's useful.</span>
       </div>`
    : '';

  return `
    <div class="page-preview">
      <div class="platform-badge" style="background:${meta.color}">
        <div class="platform-dot"></div>
        ${meta.emoji} ${meta.label}
      </div>
      <div class="page-title">${escapeHtml(title || 'Untitled page')}</div>
      <div class="page-url">${escapeHtml(truncateUrl(url))}</div>
    </div>
    ${nonTravelWarning}
    <div class="actions">
      <button class="btn-primary" id="clipBtn">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12l7-7 7 7"/>
        </svg>
        Save to TravelPanel
      </button>
      <button class="btn-secondary" id="openAppBtn">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Open app
      </button>
    </div>
  `;
}

function renderNotConfigured() {
  return `
    <div class="not-configured">
      <div style="font-size:28px;margin-bottom:10px">⚙️</div>
      <p>Set your TravelPanel URL in settings to start clipping.</p>
      <button class="config-btn" id="goToSettingsBtn">
        Open Settings
      </button>
    </div>
  `;
}

function renderSuccess(title) {
  return `
    <div class="success-state">
      <div class="success-icon">✅</div>
      <div class="success-title">Saved!</div>
      <div class="success-sub">"${escapeHtml((title || '').slice(0, 40))}" is being processed by AI</div>
    </div>
  `;
}

function renderError(msg) {
  return `
    <div style="padding:12px 16px 4px">
      <div class="error-state">⚠️ ${escapeHtml(msg)}</div>
    </div>
    <div class="actions">
      <button class="btn-secondary" id="retryBtn">Try again</button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function getCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (!tabs || tabs.length === 0) return reject(new Error('No active tab'));
      resolve(tabs[0]);
    });
  });
}

function openSharePage(appUrl, tab) {
  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
  chrome.tabs.create({ url: shareUrl });
  window.close();
}

async function init() {
  const mainContent = document.getElementById('mainContent');

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  let tab, appUrl;

  try {
    [tab, appUrl] = await Promise.all([getCurrentTab(), getAppUrl()]);
  } catch (err) {
    mainContent.innerHTML = renderError(err.message || 'Could not read current tab');
    document.getElementById('retryBtn')?.addEventListener('click', () => init());
    return;
  }

  // Check if URL is clippable (not a chrome:// or extension page)
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    mainContent.innerHTML = `
      <div class="not-configured" style="padding:20px 16px">
        <div style="font-size:28px;margin-bottom:10px">🔒</div>
        <p style="color:#64748b;font-size:13px;line-height:1.5">This page can't be clipped.<br>Navigate to a travel website and try again.</p>
      </div>
    `;
    return;
  }

  mainContent.innerHTML = renderPagePreview(tab, appUrl);

  document.getElementById('clipBtn').addEventListener('click', () => {
    openSharePage(appUrl, tab);
  });

  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
