// Platform detection matching the main app's logic
const PLATFORM_MAP = [
  { pattern: /xiaohongshu|xhslink|xhs\.link/i, id: 'xiaohongshu', label: '小红书', color: '#FF2442' },
  { pattern: /douyin|tiktok/i,                 id: 'douyin',      label: 'Douyin',  color: '#010101' },
  { pattern: /bilibili/i,                      id: 'bilibili',    label: 'Bilibili', color: '#00A1D6' },
  { pattern: /weixin|wechat|mp\.weixin/i,      id: 'wechat',      label: 'WeChat',  color: '#07C160' },
  { pattern: /instagram/i,                     id: 'instagram',   label: 'Instagram', color: '#E1306C' },
  { pattern: /youtube/i,                       id: 'youtube',     label: 'YouTube', color: '#FF0000' },
  { pattern: /twitter|x\.com/i,               id: 'twitter',     label: 'X / Twitter', color: '#1DA1F2' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_MAP) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'other', label: 'Web', color: '#6B7280' };
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 1) + '…';
}

// ── DOM refs ────────────────────────────────────────────────────────────────

const platformBadge = document.getElementById('platform-badge');
const pageTitleEl   = document.getElementById('page-title');
const pageUrlEl     = document.getElementById('page-url');
const setupNotice   = document.getElementById('setup-notice');
const setupLink     = document.getElementById('setup-link');
const errorMsg      = document.getElementById('error-msg');
const btnSave       = document.getElementById('btn-save');
const btnLabel      = document.getElementById('btn-label');
const footerStatus  = document.getElementById('footer-status');
const settingsBtn   = document.getElementById('settings-btn');

// ── State ────────────────────────────────────────────────────────────────────

let currentTabUrl   = '';
let currentTabTitle = '';
let travelpanelUrl  = '';

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

function clearError() {
  errorMsg.style.display = 'none';
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved TravelPanel URL
  const stored = await chrome.storage.sync.get('travelpanelUrl');
  travelpanelUrl = (stored.travelpanelUrl || '').replace(/\/$/, '');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl   = tab?.url   || '';
  currentTabTitle = tab?.title || currentTabUrl;

  // Detect platform and render badge
  const platform = detectPlatform(currentTabUrl);
  if (platform.id !== 'other') {
    platformBadge.textContent = platform.label;
    platformBadge.style.background = platform.color + '20';
    platformBadge.style.color = platform.color;
    platformBadge.style.display = 'inline-flex';
  }

  // Render page info
  pageTitleEl.textContent = truncate(currentTabTitle, 100);
  pageUrlEl.textContent   = truncate(currentTabUrl, 60);

  // Setup notice if URL not configured
  if (!travelpanelUrl) {
    setupNotice.style.display = 'block';
    btnSave.disabled = true;
    btnLabel.textContent = 'Configure URL to clip';
    footerStatus.textContent = '';
  } else {
    footerStatus.textContent = truncate(travelpanelUrl.replace(/^https?:\/\//, ''), 32);
  }
}

// ── Save handler ─────────────────────────────────────────────────────────────

btnSave.addEventListener('click', async () => {
  if (!travelpanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  clearError();

  // Block protocols that can't be clipped
  if (/^(chrome|chrome-extension|about|data|javascript|moz-extension):/.test(currentTabUrl)) {
    showError("Can't clip browser internal pages.");
    return;
  }

  if (!currentTabUrl) {
    showError('No URL detected on this tab.');
    return;
  }

  const shareUrl =
    travelpanelUrl +
    '/share?url=' + encodeURIComponent(currentTabUrl) +
    '&title=' + encodeURIComponent(currentTabTitle);

  // Open share page in a small popup window
  const width  = 400;
  const height = 600;
  const left   = Math.round((screen.width  - width)  / 2);
  const top    = Math.round((screen.height - height) / 2);

  await chrome.windows.create({
    url:    shareUrl,
    type:   'popup',
    width,
    height,
    left,
    top,
  });

  // Close the extension popup
  window.close();
});

// ── Settings buttons ─────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
setupLink.addEventListener('click',   () => chrome.runtime.openOptionsPage());

// ── Boot ─────────────────────────────────────────────────────────────────────

init().catch((err) => showError(err.message || 'Unexpected error'));
