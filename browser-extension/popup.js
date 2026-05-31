'use strict';

const DEFAULT_URL = '';

// Platform detection — mirrors lib/parse-url.ts
const PLATFORM_PATTERNS = [
  { pattern: /xiaohongshu|xhslink|xhs\.link/i,    label: 'Xiaohongshu', color: '#FF2D55' },
  { pattern: /douyin\.com|tiktok\.com/i,           label: 'TikTok',      color: '#000000' },
  { pattern: /instagram\.com/i,                    label: 'Instagram',   color: '#E1306C' },
  { pattern: /youtube\.com|youtu\.be/i,            label: 'YouTube',     color: '#FF0000' },
  { pattern: /bilibili\.com/i,                     label: 'Bilibili',    color: '#FB7299' },
  { pattern: /weibo\.com/i,                        label: 'Weibo',       color: '#E6162D' },
  { pattern: /twitter\.com|x\.com/i,               label: 'X',           color: '#1DA1F2' },
  { pattern: /pinterest\.com/i,                    label: 'Pinterest',   color: '#E60023' },
];

function detectPlatform(url) {
  for (const { pattern, label, color } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { label, color };
  }
  return null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function init() {
  const saveBtn    = document.getElementById('save-btn');
  const statusEl   = document.getElementById('status');
  const optionsLink = document.getElementById('options-link');
  const openAppLink = document.getElementById('open-app-link');
  const loadingEl  = document.getElementById('loading-state');
  const pageCard   = document.getElementById('page-card');
  const titleEl    = document.getElementById('page-title');
  const domainEl   = document.getElementById('page-domain');
  const faviconEl  = document.getElementById('page-favicon');
  const faviconPlaceholder = document.getElementById('page-favicon-placeholder');
  const platformChip = document.getElementById('platform-chip');

  // Load stored settings
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Populate page card
  const title  = tab.title || 'Untitled page';
  const url    = tab.url   || '';
  const domain = extractDomain(url);
  const platform = detectPlatform(url);

  titleEl.textContent  = title;
  domainEl.textContent = domain;

  // Favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  faviconEl.src = faviconUrl;
  faviconEl.onload  = () => { faviconEl.style.display = 'block'; faviconPlaceholder.style.display = 'none'; };
  faviconEl.onerror = () => { faviconEl.style.display = 'none';  faviconPlaceholder.style.display = 'block'; };
  faviconPlaceholder.style.display = 'block';

  // Platform chip
  if (platform) {
    platformChip.textContent = platform.label;
    platformChip.style.display = 'block';
    platformChip.style.background = platform.color + '22';
    platformChip.style.color = platform.color;
    platformChip.style.border = `1px solid ${platform.color}44`;
  }

  // Show card, hide loading
  loadingEl.style.display = 'none';
  pageCard.style.display  = 'flex';
  saveBtn.disabled = false;

  // Open app link
  if (travelPanelUrl) {
    openAppLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: travelPanelUrl });
      window.close();
    });
  } else {
    openAppLink.style.display = 'none';
  }

  // Options link
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Save handler
  saveBtn.addEventListener('click', async () => {
    const { travelPanelUrl: appUrl } = await chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL });

    // Require app URL to be configured
    if (!appUrl) {
      showStatus('error', 'Set your TravelPanel URL in Settings first.');
      chrome.runtime.openOptionsPage();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:15px;height:15px;animation:spin 0.7s linear infinite">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Saving…`;

    const shareUrl = new URL('/share', appUrl);
    shareUrl.searchParams.set('url', url);
    shareUrl.searchParams.set('title', title);

    try {
      await chrome.tabs.create({ url: shareUrl.toString() });
      showStatus('success', '✓ Opened in TravelPanel');
      setTimeout(() => window.close(), 1200);
    } catch {
      showStatus('error', 'Failed to open TravelPanel. Check Settings.');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
        Save to TravelPanel`;
    }
  });
}

function showStatus(type, message) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
}

// CSS keyframe for spinner (inject dynamically)
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

init().catch((err) => {
  console.error('TravelPanel Clipper error:', err);
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('page-card').style.display = 'flex';
  document.getElementById('page-title').textContent = 'Could not load page info';
});
