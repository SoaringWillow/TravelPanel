// Platform detection (mirrors lib/parse-url.ts)
const PLATFORM_META = {
  wechat:       { label: 'WeChat',          color: '#07C160', bg: '#071a0e' },
  xiaohongshu:  { label: 'Little Red Book', color: '#FF2442', bg: '#1a0509' },
  douyin:       { label: 'Douyin / TikTok', color: '#aaaacc', bg: '#161616' },
  bilibili:     { label: 'Bilibili',        color: '#00AEEC', bg: '#051525' },
  other:        { label: 'Web Page',        color: '#6366f1', bg: '#0f0f1f' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

let currentTabUrl = '';
let currentTabTitle = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const clipBtn       = document.getElementById('clipBtn');
const pageTitle     = document.getElementById('pageTitle');
const pageUrl       = document.getElementById('pageUrl');
const faviconImg    = document.getElementById('faviconImg');
const platformBadge = document.getElementById('platformBadge');
const platformDot   = document.getElementById('platformDot');
const platformLabel = document.getElementById('platformLabel');
const settingsBtn   = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const appUrlInput   = document.getElementById('appUrlInput');
const saveSettings  = document.getElementById('saveSettings');
const statusLoading = document.getElementById('statusLoading');
const statusSuccess = document.getElementById('statusSuccess');
const statusError   = document.getElementById('statusError');
const statusSuccessText = document.getElementById('statusSuccessText');
const statusErrorText   = document.getElementById('statusErrorText');

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(type, message) {
  statusLoading.classList.remove('visible');
  statusSuccess.classList.remove('visible');
  statusError.classList.remove('visible');
  if (type === 'loading') statusLoading.classList.add('visible');
  if (type === 'success') { statusSuccessText.textContent = message; statusSuccess.classList.add('visible'); }
  if (type === 'error')   { statusErrorText.textContent = message;   statusError.classList.add('visible'); }
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : (str || '');
}

async function getStoredAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelPanelUrl'], (result) => {
      resolve(result.travelPanelUrl || DEFAULT_APP_URL);
    });
  });
}

// ── Init: load current tab ────────────────────────────────────────────────────

async function init() {
  // Load stored app URL into settings
  const storedUrl = await getStoredAppUrl();
  appUrlInput.value = storedUrl === DEFAULT_APP_URL ? '' : storedUrl;

  // Query current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    pageTitle.textContent = 'No active tab found';
    clipBtn.disabled = true;
    return;
  }

  currentTabUrl   = tab.url   || '';
  currentTabTitle = tab.title || '';

  // Render page info
  pageTitle.textContent = truncate(currentTabTitle, 60) || '(No title)';
  pageUrl.textContent   = truncate(currentTabUrl,   55) || '—';

  // Favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(currentTabUrl)}&sz=32`;
  faviconImg.src = faviconUrl;
  faviconImg.onerror = () => { faviconImg.style.display = 'none'; };

  // Platform badge
  const platform = detectPlatform(currentTabUrl);
  const meta = PLATFORM_META[platform];
  platformDot.style.backgroundColor = meta.color;
  platformLabel.textContent = meta.label;
  platformBadge.style.display = 'inline-flex';
  platformBadge.style.background = meta.bg;
  platformBadge.style.color = meta.color;
  platformBadge.style.border = `1px solid ${meta.color}33`;

  // Disable clip if it's a chrome:// or extension page
  if (!currentTabUrl || currentTabUrl.startsWith('chrome://') || currentTabUrl.startsWith('chrome-extension://') || currentTabUrl.startsWith('about:')) {
    clipBtn.disabled = true;
    pageTitle.textContent = 'Cannot clip this page';
    pageUrl.textContent = 'Navigate to a travel URL first';
  }
}

// ── Clip action ───────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentTabUrl) return;

  clipBtn.disabled = true;
  setStatus('loading');

  try {
    const appBase = await getStoredAppUrl();
    const targetUrl = `${appBase.replace(/\/$/, '')}/?import=${encodeURIComponent(currentTabUrl)}`;

    // Look for an existing TravelPanel tab to reuse
    const appHost = new URL(appBase).hostname;
    const existingTabs = await chrome.tabs.query({ url: `*://${appHost}/*` });

    if (existingTabs.length > 0) {
      // Navigate the existing TravelPanel tab and focus it
      const existing = existingTabs[0];
      await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
      setStatus('success', `Clip sent to TravelPanel — analyzing your link now.`);
    } else {
      // Open a new tab
      await chrome.tabs.create({ url: targetUrl });
      setStatus('success', `Opened TravelPanel with your clip.`);
    }

    // Auto-close popup after success
    setTimeout(() => window.close(), 1400);
  } catch (err) {
    setStatus('error', `Error: ${err.message || 'Could not open TravelPanel.'}`);
    clipBtn.disabled = false;
  }
});

// ── Settings toggle ───────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});

saveSettings.addEventListener('click', async () => {
  const raw = appUrlInput.value.trim();
  let url = raw || DEFAULT_APP_URL;

  // Validate URL
  try {
    new URL(url);
  } catch {
    setStatus('error', 'Invalid URL. Use https://your-app.vercel.app');
    return;
  }

  await chrome.storage.sync.set({ travelPanelUrl: url });
  settingsPanel.classList.remove('open');
  setStatus('success', 'Settings saved.');
  setTimeout(() => setStatus('', ''), 2000);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
