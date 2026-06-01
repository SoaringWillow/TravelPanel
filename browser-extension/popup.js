'use strict';

const PLATFORM_META = {
  wechat:       { label: 'WeChat',             color: '#07C160' },
  xiaohongshu:  { label: 'Little Red Book',    color: '#FF2442' },
  douyin:       { label: 'Douyin / TikTok',    color: '#161823' },
  bilibili:     { label: 'Bilibili',           color: '#00AEEC' },
  instagram:    { label: 'Instagram',          color: '#E1306C' },
  youtube:      { label: 'YouTube',            color: '#FF0000' },
  twitter:      { label: 'X / Twitter',        color: '#000000' },
  other:        { label: 'Web',                color: '#6366F1' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'other';
}

// ── DOM refs ──────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  const { travelpanelUrl } = await chrome.storage.sync.get('travelpanelUrl');

  if (!travelpanelUrl) {
    $('notConfigured').style.display = 'block';
    $('openOptionsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  $('mainView').style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  const title = tab?.title ?? url;

  // Can't clip browser-internal pages
  const isClippable = url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('about:') && !url.startsWith('edge://');

  const platform = detectPlatform(url);
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.other;

  const chip = $('platformChip');
  chip.textContent = meta.label;
  chip.style.backgroundColor = meta.color;

  $('pageTitle').textContent = title || 'Untitled page';
  $('pageUrl').textContent = url || 'No URL';

  if (!isClippable) {
    $('clipBtn').disabled = true;
    $('clipBtn').textContent = 'Navigate to a webpage to clip';
    return;
  }

  $('clipBtn').addEventListener('click', () => clipPage(travelpanelUrl, url, title));
}

async function clipPage(baseUrl, url, title) {
  const btn = $('clipBtn');
  btn.disabled = true;
  btn.textContent = 'Opening…';

  try {
    const shareUrl = `${baseUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    await chrome.tabs.create({ url: shareUrl });
    showSuccess(title);
  } catch (err) {
    $('errorNotice').textContent = `Could not open TravelPanel: ${err.message}`;
    $('errorNotice').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      Clip to TravelPanel`;
  }
}

function showSuccess(title) {
  $('mainView').style.display = 'none';
  $('successState').style.display = 'block';
  const short = title.length > 50 ? title.slice(0, 50) + '…' : title;
  $('successSub').textContent = `"${short}" opened in TravelPanel.`;
  setTimeout(() => window.close(), 1800);
}

// ── Settings button ───────────────────────────────────────────────────────

$('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Boot ──────────────────────────────────────────────────────────────────

init();
