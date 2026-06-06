// ─── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORM_INFO = {
  wechat: { label: 'WeChat', color: '#07C160', bg: 'rgba(7,193,96,0.15)', icon: '💬' },
  xiaohongshu: { label: 'Little Red Book', color: '#FF2442', bg: 'rgba(255,36,66,0.15)', icon: '📕' },
  douyin: { label: 'Douyin / TikTok', color: '#69C9D0', bg: 'rgba(105,201,208,0.15)', icon: '🎵' },
  bilibili: { label: 'Bilibili', color: '#00AEEC', bg: 'rgba(0,174,236,0.15)', icon: '📺' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', icon: '📸' },
  youtube: { label: 'YouTube', color: '#FF0000', bg: 'rgba(255,0,0,0.15)', icon: '▶️' },
  other: { label: 'Web', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function showStatus(text, showSpinner = true) {
  el('statusArea').classList.add('visible');
  el('statusSpinner').style.display = showSpinner ? 'block' : 'none';
  el('statusText').textContent = text;
}

function hideStatus() {
  el('statusArea').classList.remove('visible');
}

function showError(msg) {
  hideStatus();
  el('errorBox').textContent = msg;
  el('errorBox').classList.add('visible');
}

function hideError() {
  el('errorBox').classList.remove('visible');
}

function renderPlatformBadge(platform, url) {
  const info = PLATFORM_INFO[platform] || PLATFORM_INFO.other;
  const badge = el('platformBadge');
  badge.textContent = `${info.icon} ${info.label}`;
  badge.style.color = info.color;
  badge.style.background = info.bg;
  badge.style.display = 'inline-flex';
}

function renderPreview(result) {
  const stats = [];

  if (result.locations && result.locations.length > 0) {
    stats.push({
      icon: '📍',
      text: `${result.locations.length} location${result.locations.length !== 1 ? 's' : ''}`,
      type: 'success',
    });
  }

  if (result.substance && result.substance.length > 0) {
    stats.push({
      icon: '💡',
      text: `${result.substance.length} tip${result.substance.length !== 1 ? 's' : ''}`,
      type: 'default',
    });
  }

  if (result.activities && result.activities.length > 0) {
    stats.push({
      icon: '✅',
      text: `${result.activities.length} activit${result.activities.length !== 1 ? 'ies' : 'y'}`,
      type: 'default',
    });
  }

  if (stats.length === 0) {
    stats.push({ icon: '📄', text: 'Clipped', type: 'default' });
  }

  const container = el('previewStats');
  container.innerHTML = stats.map(s => `
    <div class="stat-pill ${s.type === 'success' ? 'success' : ''}">
      ${s.icon} ${s.text}
    </div>
  `).join('');

  el('previewArea').classList.add('visible');
}

// ─── Main popup logic ─────────────────────────────────────────────────────────

let currentTabUrl = '';
let currentTabTitle = '';
let appUrl = DEFAULT_APP_URL;
let clipped = false;

async function init() {
  appUrl = await getAppUrl();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    showError('Could not read the current tab URL.');
    return;
  }

  currentTabUrl = tab.url;
  currentTabTitle = tab.title || '';

  // Block non-HTTP URLs (chrome://, about:, etc.)
  if (!currentTabUrl.startsWith('http://') && !currentTabUrl.startsWith('https://')) {
    el('pageTitle').textContent = 'Not a web page';
    el('pageUrl').textContent = currentTabUrl;
    el('clipBtn').disabled = true;
    el('clipBtn').textContent = '— Not clippable —';
    return;
  }

  // Favicon
  const favicon = el('favicon');
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(currentTabUrl).hostname}&sz=32`;
  favicon.src = faviconUrl;
  favicon.onerror = () => { favicon.style.display = 'none'; };

  // Platform badge
  const platform = detectPlatform(currentTabUrl);
  renderPlatformBadge(platform, currentTabUrl);

  // Title + URL
  el('pageTitle').textContent = currentTabTitle || new URL(currentTabUrl).hostname;
  el('pageUrl').textContent = currentTabUrl;

  // Show hint for non-social-media URLs
  if (platform === 'other') {
    el('hint').classList.add('visible');
  }

  el('viewAllBtn').style.display = 'flex';
}

// ─── Clip action ──────────────────────────────────────────────────────────────

async function clip() {
  if (clipped) return;
  clipped = true;

  hideError();
  el('previewArea').classList.remove('visible');
  el('hint').classList.remove('visible');
  el('clipBtn').disabled = true;

  // Try to call the TravelPanel API for a quick preview, then open the app.
  // We do both in parallel: start extraction, open the tab with ?import= URL.
  const encodedUrl = encodeURIComponent(currentTabUrl);
  const importPageUrl = `${appUrl}?import=${encodedUrl}`;

  showStatus('Extracting travel content…');

  let extractionResult = null;
  try {
    const response = await fetch(`${appUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentTabUrl }),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      extractionResult = await response.json();
    }
  } catch {
    // Network error or timeout — fall through to open-in-app approach
  }

  hideStatus();

  // Show success view
  el('mainView').style.display = 'none';
  el('successView').classList.add('visible');

  if (extractionResult) {
    const locCount = extractionResult.locations?.length ?? 0;
    const tipCount = extractionResult.substance?.length ?? 0;
    const parts = [];
    if (locCount > 0) parts.push(`${locCount} location${locCount !== 1 ? 's' : ''}`);
    if (tipCount > 0) parts.push(`${tipCount} tip${tipCount !== 1 ? 's' : ''}`);
    el('successSub').textContent = parts.length > 0
      ? `Extracted ${parts.join(' and ')}. Open TravelPanel to save.`
      : 'Open TravelPanel to save this clip.';
  } else {
    el('successSub').textContent = 'Open TravelPanel to save this clip.';
  }

  // Open TravelPanel with the URL pre-filled
  chrome.tabs.create({ url: importPageUrl });
}

// ─── Event listeners ──────────────────────────────────────────────────────────

el('clipBtn').addEventListener('click', clip);

el('openAppBtn').addEventListener('click', async () => {
  chrome.tabs.create({ url: appUrl });
});

el('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

el('viewAllBtn').addEventListener('click', async () => {
  chrome.tabs.create({ url: appUrl });
});

el('successViewBtn').addEventListener('click', async () => {
  const encodedUrl = encodeURIComponent(currentTabUrl);
  chrome.tabs.create({ url: `${appUrl}?import=${encodedUrl}` });
});

el('clipAnotherBtn').addEventListener('click', () => {
  clipped = false;
  el('mainView').style.display = 'block';
  el('successView').classList.remove('visible');
  el('clipBtn').disabled = false;
  hideError();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init().catch((err) => {
  showError(`Failed to load tab info: ${err.message}`);
});
