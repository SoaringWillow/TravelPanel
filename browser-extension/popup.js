// TravelPanel Clipper — Popup script

const DEFAULT_URL = 'http://localhost:3000';

// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORMS = [
  { id: 'xiaohongshu', pattern: /xiaohongshu\.com|xhslink\.com/i,  label: 'Xiaohongshu', color: '#FF2442' },
  { id: 'wechat',      pattern: /mp\.weixin\.qq\.com/i,            label: 'WeChat',       color: '#07C160' },
  { id: 'douyin',      pattern: /douyin\.com|tiktok\.com/i,        label: 'Douyin/TikTok',color: '#010101' },
  { id: 'bilibili',    pattern: /bilibili\.com|b23\.tv/i,          label: 'Bilibili',     color: '#00AEEC' },
  { id: 'instagram',   pattern: /instagram\.com/i,                 label: 'Instagram',    color: '#E1306C' },
  { id: 'youtube',     pattern: /youtube\.com|youtu\.be/i,         label: 'YouTube',      color: '#FF0000' },
  { id: 'twitter',     pattern: /twitter\.com|x\.com/i,            label: 'X / Twitter',  color: '#1DA1F2' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6B7280' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function init() {
  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: '' });
  const baseUrl = (travelpanelUrl || '').replace(/\/$/, '');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const pagePreview = document.getElementById('pagePreview');
  const noUrlState  = document.getElementById('noUrlState');
  const clipBtn     = document.getElementById('clipBtn');
  const configWarn  = document.getElementById('configWarning');

  // Check if it's a clippable page
  const url   = tab?.url   || '';
  const title = tab?.title || '';
  const isClippable = url.startsWith('http://') || url.startsWith('https://');

  if (!isClippable) {
    noUrlState.style.display = 'block';
    return;
  }

  // Show page preview
  const platform = detectPlatform(url);
  const chip = document.getElementById('platformChip');
  chip.textContent = platform.label;
  chip.style.backgroundColor = platform.color;

  document.getElementById('pageTitle').textContent = title || 'Untitled page';
  document.getElementById('pageUrl').textContent   = url;
  pagePreview.style.display = 'block';

  // Config check
  if (!baseUrl) {
    configWarn.style.display = 'flex';
    clipBtn.disabled = true;
  } else {
    clipBtn.disabled = false;
  }

  // ─── Clip button ────────────────────────────────────────────────────────────

  clipBtn.addEventListener('click', async () => {
    const resolvedBase = baseUrl || DEFAULT_URL;
    const shareUrl = `${resolvedBase}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    chrome.runtime.sendMessage({ type: 'open-share', url: shareUrl });
    window.close();
  });

  // ─── Open app ───────────────────────────────────────────────────────────────

  document.getElementById('openAppBtn').addEventListener('click', () => {
    const resolvedBase = baseUrl || DEFAULT_URL;
    chrome.tabs.create({ url: resolvedBase });
    window.close();
  });

  // ─── Settings buttons ────────────────────────────────────────────────────────

  function openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('footerSettingsBtn').addEventListener('click', openSettings);

  const warnLink = document.getElementById('warningSettingsLink');
  if (warnLink) warnLink.addEventListener('click', openSettings);
}

init();
