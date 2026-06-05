// ── Platform detection (mirrors lib/parse-url.ts) ─────────────────────────

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  instagram: '#E1306C',
  youtube: '#FF0000',
  other: '#6366F1',
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

// ── Default app URL ─────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── DOM helpers ─────────────────────────────────────────────────────────────

const mainEl = document.getElementById('main');
const openAppBtn = document.getElementById('openAppBtn');
const settingsBtn = document.getElementById('settingsBtn');

// ── State ───────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = DEFAULT_APP_URL;

// ── Load app URL from storage ───────────────────────────────────────────────

chrome.storage.sync.get(['appUrl'], (result) => {
  appUrl = result.appUrl || DEFAULT_APP_URL;

  // Update "Open TravelPanel" footer link
  openAppBtn.onclick = () => {
    chrome.tabs.create({ url: appUrl });
  };

  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0] || null;
    render();
  });
});

// ── Settings button ─────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Render ──────────────────────────────────────────────────────────────────

function render() {
  const isConfigured = appUrl && appUrl !== DEFAULT_APP_URL;
  const url = currentTab?.url || '';
  const title = currentTab?.title || '';
  const isClippable = url && (url.startsWith('http://') || url.startsWith('https://'));

  if (!isClippable) {
    mainEl.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🗺️</div>
        <p>Navigate to a travel page<br>to clip it to TravelPanel.</p>
      </div>
    `;
    return;
  }

  const platform = detectPlatform(url);
  const platformLabel = PLATFORM_LABELS[platform];
  const platformColor = PLATFORM_COLORS[platform];
  const shortUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

  mainEl.innerHTML = `
    ${!isConfigured ? `
      <div class="config-notice">
        ⚙️ Set your TravelPanel URL in <span class="config-link" id="configLink">Settings</span> to clip directly to your app.
      </div>
    ` : ''}

    <span class="platform-chip" style="background:${platformColor}">${platformLabel}</span>

    <p class="page-title">${escapeHtml(title || 'Untitled page')}</p>
    <p class="page-url">${escapeHtml(shortUrl)}</p>

    <button class="clip-btn" id="clipBtn">
      <span class="clip-btn-icon">📌</span>
      Clip to TravelPanel
    </button>
  `;

  document.getElementById('clipBtn').addEventListener('click', () => handleClip(url, title));

  const configLinkEl = document.getElementById('configLink');
  if (configLinkEl) {
    configLinkEl.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }
}

// ── Clip action ──────────────────────────────────────────────────────────────

function handleClip(url, title) {
  const btn = document.getElementById('clipBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="clip-btn-icon">⏳</span> Opening…';
  }

  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;

  // Open the share flow in a new tab
  chrome.tabs.create({ url: shareUrl }, () => {
    // Show success state briefly, then close the popup
    mainEl.innerHTML = `
      <div class="success-state">
        <div class="emoji">✅</div>
        <p class="success-msg">Opened in TravelPanel</p>
        <p class="success-sub">Select a board in the new tab to save this clip.</p>
      </div>
    `;
    setTimeout(() => window.close(), 1500);
  });
}

// ── Utils ────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
