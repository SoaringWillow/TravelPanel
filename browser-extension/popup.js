// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORM_META = {
  instagram:    { label: 'Instagram',     color: '#e1306c' },
  youtube:      { label: 'YouTube',       color: '#ff0000' },
  xiaohongshu:  { label: 'Xiaohongshu',  color: '#ff2442' },
  douyin:       { label: 'Douyin',        color: '#010101' },
  bilibili:     { label: 'Bilibili',      color: '#00a1d6' },
  tiktok:       { label: 'TikTok',        color: '#010101' },
  twitter:      { label: 'Twitter/X',     color: '#1da1f2' },
  facebook:     { label: 'Facebook',      color: '#1877f2' },
  pinterest:    { label: 'Pinterest',     color: '#e60023' },
  tripadvisor:  { label: 'TripAdvisor',   color: '#00af87' },
  airbnb:       { label: 'Airbnb',        color: '#ff5a5f' },
  booking:      { label: 'Booking.com',   color: '#003580' },
  other:        { label: 'Web',           color: '#6366f1' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('instagram.com'))                        return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('rednote')) return 'xiaohongshu';
  if (u.includes('douyin.com'))                          return 'douyin';
  if (u.includes('bilibili.com'))                        return 'bilibili';
  if (u.includes('tiktok.com'))                          return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('pinterest.com'))                       return 'pinterest';
  if (u.includes('tripadvisor.'))                        return 'tripadvisor';
  if (u.includes('airbnb.com'))                          return 'airbnb';
  if (u.includes('booking.com'))                         return 'booking';
  return 'other';
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const mainView          = document.getElementById('mainView');
const successView       = document.getElementById('successView');
const pageInfoEl        = document.getElementById('pageInfo');
const errorBanner       = document.getElementById('errorBanner');
const clipBtn           = document.getElementById('clipBtn');
const openAppBtn        = document.getElementById('openAppBtn');
const noteInput         = document.getElementById('noteInput');
const settingsPanel     = document.getElementById('settingsPanel');
const settingsToggle    = document.getElementById('settingsToggle');
const footerSettingsToggle = document.getElementById('footerSettingsToggle');
const appUrlInput       = document.getElementById('appUrlInput');
const saveSettingsBtn   = document.getElementById('saveSettingsBtn');
const successSub        = document.getElementById('successSub');

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let appUrl = '';

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load saved app URL
  const stored = await chrome.storage.sync.get(['appUrl']);
  appUrl = stored.appUrl || 'https://your-app.vercel.app';
  appUrlInput.value = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    showError('This page cannot be clipped. Navigate to a travel page first.');
    clipBtn.disabled = true;
    return;
  }

  renderPageInfo(tab.url, tab.title || tab.url);
}

function renderPageInfo(url, title) {
  const platform = detectPlatform(url);
  const meta = PLATFORM_META[platform] || PLATFORM_META.other;

  const hostname = (() => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  })();

  pageInfoEl.innerHTML = `
    <span class="platform-chip" style="background:${meta.color}">${meta.label}</span>
    <div class="page-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
    <div class="page-url" title="${escapeHtml(url)}">${escapeHtml(hostname)}</div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}

// ─── Clip action ──────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', async () => {
  if (!currentTab?.url) return;

  const baseUrl = appUrl.replace(/\/$/, '');
  if (!baseUrl || baseUrl === 'https://your-app.vercel.app') {
    showError('Please set your TravelPanel URL in Settings first.');
    openSettings();
    return;
  }

  const note = noteInput.value.trim();
  const params = new URLSearchParams({
    url: currentTab.url,
    title: currentTab.title || currentTab.url,
  });
  if (note) params.set('note', note);

  const shareUrl = `${baseUrl}/share?${params.toString()}`;

  // Show loading state
  clipBtn.disabled = true;
  clipBtn.innerHTML = `<div class="spinner"></div> Clipping…`;

  // Open the share page in a new tab
  try {
    await chrome.tabs.create({ url: shareUrl, active: true });

    // Show success
    mainView.style.display = 'none';
    successView.style.display = 'block';
    successSub.textContent = 'Opened in TravelPanel. AI is extracting locations & wisdom…';

    openAppBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: baseUrl });
      window.close();
    });
  } catch (err) {
    clipBtn.disabled = false;
    clipBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Clip to TravelPanel`;
    showError('Could not open TravelPanel. Check the URL in settings.');
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────

function openSettings() {
  settingsPanel.classList.add('visible');
  appUrlInput.focus();
}

function toggleSettings() {
  settingsPanel.classList.toggle('visible');
  if (settingsPanel.classList.contains('visible')) {
    appUrlInput.focus();
  }
}

settingsToggle.addEventListener('click', toggleSettings);
footerSettingsToggle.addEventListener('click', toggleSettings);

saveSettingsBtn.addEventListener('click', async () => {
  const val = appUrlInput.value.trim().replace(/\/$/, '');
  if (!val) return;
  appUrl = val;
  await chrome.storage.sync.set({ appUrl: val });
  saveSettingsBtn.textContent = 'Saved ✓';
  setTimeout(() => {
    saveSettingsBtn.textContent = 'Save';
    settingsPanel.classList.remove('visible');
  }, 1200);
});

appUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettingsBtn.click();
});

// ─── Keyboard shortcut in popup ───────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement !== noteInput) {
    clipBtn.click();
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
