'use strict';

// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_LABELS = {
  xiaohongshu: 'Little Red Book',
  wechat: 'WeChat',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

const PLATFORM_COLORS = {
  xiaohongshu: '#FF2442',
  wechat: '#07C160',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

function isClippable(url) {
  if (!url) return false;
  const unclippable = ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:', 'edge://'];
  return !unclippable.some((prefix) => url.startsWith(prefix));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const url   = tab?.url   || '';
  const title = tab?.title || '';

  // Retrieve saved TravelPanel URL
  const stored = await chrome.storage.sync.get('travelPanelUrl');
  const travelPanelUrl = (stored.travelPanelUrl || '').replace(/\/$/, '');

  const clipBtn         = document.getElementById('clipBtn');
  const notConfigured   = document.getElementById('notConfigured');
  const noClipState     = document.getElementById('noClipState');
  const pageCard        = document.getElementById('pageCard');
  const successState    = document.getElementById('successState');
  const successSub      = document.getElementById('successSub');

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('configureLink').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Cannot clip this page ─────────────────────────────────────────────────
  if (!isClippable(url)) {
    pageCard.style.display    = 'none';
    clipBtn.style.display     = 'none';
    noClipState.style.display = 'block';
    return;
  }

  // ── Fill page card ────────────────────────────────────────────────────────
  const platform = detectPlatform(url);
  const color    = PLATFORM_COLORS[platform];
  const label    = PLATFORM_LABELS[platform];

  const badge = document.getElementById('platformBadge');
  badge.textContent          = label;
  badge.style.backgroundColor = color + '18';  // 10% opacity tint
  badge.style.color           = color;

  document.getElementById('pageTitle').textContent = title || 'Untitled page';
  document.getElementById('pageUrl').textContent   = url;

  // ── Not configured ────────────────────────────────────────────────────────
  if (!travelPanelUrl) {
    notConfigured.style.display = 'block';
    clipBtn.disabled = true;
    return;
  }

  // ── Clip button handler ───────────────────────────────────────────────────
  clipBtn.addEventListener('click', () => {
    const shareUrl =
      travelPanelUrl +
      '/share?url=' + encodeURIComponent(url) +
      '&title='     + encodeURIComponent(title);

    // Open TravelPanel share page in a new tab
    chrome.tabs.create({ url: shareUrl });

    // Show quick success state then close popup
    pageCard.style.display       = 'none';
    clipBtn.style.display        = 'none';
    notConfigured.style.display  = 'none';
    successState.style.display   = 'block';

    const platformNote = platform !== 'other'
      ? `AI will extract locations + wisdom from this ${label} post.`
      : 'AI will extract travel locations + tips from this page.';
    successSub.textContent = platformNote;

    setTimeout(() => window.close(), 1200);
  });
}

init().catch(console.error);
