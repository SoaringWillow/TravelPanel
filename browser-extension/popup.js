const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const TRAVEL_PLATFORMS = [
  { pattern: /instagram\.com/, label: 'Instagram' },
  { pattern: /youtube\.com|youtu\.be/, label: 'YouTube' },
  { pattern: /xiaohongshu\.com|xhslink\.com/, label: 'Xiaohongshu' },
  { pattern: /douyin\.com/, label: 'Douyin' },
  { pattern: /bilibili\.com/, label: 'Bilibili' },
  { pattern: /tiktok\.com/, label: 'TikTok' },
  { pattern: /tripadvisor\.com/, label: 'TripAdvisor' },
  { pattern: /booking\.com/, label: 'Booking.com' },
  { pattern: /airbnb\.com/, label: 'Airbnb' },
  { pattern: /lonely\s*planet\.com/, label: 'Lonely Planet' },
];

const TRAVEL_KEYWORDS = [
  'travel', 'hotel', 'trip', 'tour', 'itinerary', 'destination',
  'visit', 'explore', 'resort', 'hostel', 'restaurant', 'cafe',
  'museum', 'beach', 'mountain', 'hike', 'city guide', 'things to do',
];

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim() || DEFAULT_APP_URL);
    });
  });
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function detectPlatform(url) {
  for (const { pattern, label } of TRAVEL_PLATFORMS) {
    if (pattern.test(url)) return label;
  }
  return null;
}

function isTravelPage(url, title) {
  if (detectPlatform(url)) return true;
  const text = `${url} ${title}`.toLowerCase();
  return TRAVEL_KEYWORDS.some(kw => text.includes(kw));
}

function setButtonState(btn, state) {
  const ICONS = {
    clip: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    loading: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-dasharray="28 56" stroke-dashoffset="0" style="animation:spin 0.7s linear infinite"/></svg>`,
    check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  const STATES = {
    idle:    { icon: 'clip',    label: 'Clip to TravelPanel', disabled: false, cls: '' },
    loading: { icon: 'loading', label: 'Opening TravelPanel…', disabled: true,  cls: '' },
    success: { icon: 'check',   label: 'Clipped!',             disabled: true,  cls: 'success' },
  };

  const s = STATES[state] || STATES.idle;
  btn.disabled = s.disabled;
  btn.className = `clip-btn ${s.cls}`;
  btn.innerHTML = `${ICONS[s.icon]} ${s.label}`;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const titleEl    = document.getElementById('pageTitle');
  const domainEl   = document.getElementById('pageDomain');
  const faviconEl  = document.getElementById('favicon');
  const placeholder = document.getElementById('faviconPlaceholder');
  const clipBtn    = document.getElementById('clipBtn');
  const statusBar  = document.getElementById('statusBar');
  const settingsBtn = document.getElementById('settingsBtn');
  const travelHint = document.getElementById('travelHint');

  // Populate page info
  const title = tab.title || 'Untitled page';
  titleEl.textContent = title;
  domainEl.textContent = getDomain(tab.url || '');

  // Favicon
  if (tab.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
    placeholder.style.display = 'none';
    faviconEl.onerror = () => {
      faviconEl.style.display = 'none';
      placeholder.style.display = 'flex';
    };
  }

  // Travel platform hint
  const platform = detectPlatform(tab.url || '');
  if (platform) {
    travelHint.textContent = `Detected ${platform} — AI will extract spots + travel wisdom`;
  } else if (isTravelPage(tab.url || '', title)) {
    travelHint.textContent = 'AI will extract locations + tips from this page';
  }

  // Clip action
  clipBtn.addEventListener('click', async () => {
    const appUrl = await getAppUrl();
    const dest = `${appUrl.replace(/\/$/, '')}?import=${encodeURIComponent(tab.url || '')}`;

    setButtonState(clipBtn, 'loading');
    statusBar.className = 'status-bar';
    statusBar.style.display = 'none';

    try {
      await chrome.tabs.create({ url: dest, active: true });
      setButtonState(clipBtn, 'success');
      statusBar.textContent = '✓ Opened in TravelPanel — AI extraction in progress';
      statusBar.className = 'status-bar success';
      setTimeout(() => window.close(), 1400);
    } catch (err) {
      setButtonState(clipBtn, 'idle');
      statusBar.textContent = '✗ Could not open TravelPanel. Check Settings for your app URL.';
      statusBar.className = 'status-bar error';
    }
  });

  // Settings
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
