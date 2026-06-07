// Mirrors lib/parse-url.ts — kept in sync manually
const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#3A3A45',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

function detectPlatform(url) {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let currentUrl = '';
let currentTitle = '';
let serverUrl = '';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab.url || '';
  currentTitle = tab.title || '';

  const stored = await chrome.storage.local.get('tpServerUrl');
  serverUrl = stored.tpServerUrl || '';

  render();
}

function render() {
  const content = document.getElementById('content');

  if (!serverUrl) {
    content.innerHTML = `
      <div class="setup-card">
        <div class="setup-emoji">🗺️</div>
        <div class="setup-title">Connect to TravelPanel</div>
        <div class="setup-desc">Enter your TravelPanel server URL to start clipping travel content.</div>
        <button class="configure-btn" id="configureBtn">Open Settings</button>
      </div>`;
    document.getElementById('configureBtn').onclick = () => chrome.runtime.openOptionsPage();
    return;
  }

  const platform = detectPlatform(currentUrl);
  const color = PLATFORM_COLORS[platform];
  const label = PLATFORM_LABELS[platform];
  const title = (currentTitle || 'Untitled page').slice(0, 100);
  const urlShort = currentUrl.length > 48 ? currentUrl.slice(0, 48) + '…' : currentUrl;

  content.innerHTML = `
    <div class="page-info">
      <div class="page-title">${esc(title)}</div>
      <div class="meta-row">
        <span class="platform-badge" style="background:${color}">
          <span class="platform-dot"></span>${esc(label)}
        </span>
        <span class="url-text">${esc(urlShort)}</span>
      </div>
    </div>
    <button class="clip-btn" id="clipBtn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Clip this page
    </button>`;
  document.getElementById('clipBtn').onclick = doClip;
}

async function doClip() {
  const platform = detectPlatform(currentUrl);
  const color = PLATFORM_COLORS[platform];
  const label = PLATFORM_LABELS[platform];
  const title = (currentTitle || 'Untitled page').slice(0, 100);
  const urlShort = currentUrl.length > 48 ? currentUrl.slice(0, 48) + '…' : currentUrl;

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-info">
      <div class="page-title">${esc(title)}</div>
      <div class="meta-row">
        <span class="platform-badge" style="background:${color}">
          <span class="platform-dot"></span>${esc(label)}
        </span>
        <span class="url-text">${esc(urlShort)}</span>
      </div>
    </div>
    <div class="loading-state">
      <div class="spinner"></div>
      Extracting travel wisdom…
    </div>`;

  try {
    const apiUrl = serverUrl.replace(/\/$/, '') + '/api/import';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Source': 'browser-extension' },
      body: JSON.stringify({ url: currentUrl }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Server ${res.status}${text ? ': ' + text.slice(0, 80) : ''}`);
    }

    const result = await res.json();
    const locCount = result.locations?.length ?? 0;
    const insightCount = result.substance?.length ?? 0;
    const extractedTitle = result.title || title;

    const shareUrl = `${serverUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(extractedTitle)}`;

    const statsHtml = [
      locCount > 0 && `<div class="stat-chip">📍 ${locCount} spot${locCount !== 1 ? 's' : ''}</div>`,
      insightCount > 0 && `<div class="stat-chip">💡 ${insightCount} insight${insightCount !== 1 ? 's' : ''}</div>`,
      locCount === 0 && insightCount === 0 && '<div class="stat-chip">📎 Preview ready</div>',
    ].filter(Boolean).join('');

    content.innerHTML = `
      <div class="page-info">
        <div class="page-title">${esc(extractedTitle.slice(0, 100))}</div>
        <div class="meta-row">
          <span class="platform-badge" style="background:${color}">
            <span class="platform-dot"></span>${esc(label)}
          </span>
          <span class="url-text">${esc(urlShort)}</span>
        </div>
      </div>
      <div class="success-card">
        <div class="success-header">
          <div class="success-check">✓</div>
          <div>
            <div class="success-title">Preview extracted</div>
            <div class="success-subtitle">Open TravelPanel to save this clip</div>
          </div>
        </div>
        <div class="stats-row">${statsHtml}</div>
      </div>
      <a class="open-link" href="${esc(shareUrl)}" target="_blank" rel="noopener noreferrer">
        Open in TravelPanel to save →
      </a>`;
  } catch (err) {
    content.innerHTML = `
      <div class="page-info">
        <div class="page-title">${esc(title)}</div>
      </div>
      <div class="error-card">
        ⚠ Could not reach TravelPanel server.
        <div class="error-detail">${esc(String(err))}</div>
      </div>
      <button class="retry-btn" id="retryBtn">Try again</button>`;
    document.getElementById('retryBtn').onclick = render;
  }
}

document.getElementById('gearBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

init().catch(console.error);
