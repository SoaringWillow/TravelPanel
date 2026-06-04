// TravelPanel Clipper — popup controller

const UNCLIPPABLE = /^(chrome|chrome-extension|about|data|javascript|moz-extension|edge|brave):\/\//i;

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORMS = [
  { pattern: /instagram\.com/i,              label: 'Instagram',    color: '#E1306C' },
  { pattern: /youtube\.com|youtu\.be/i,      label: 'YouTube',      color: '#FF0000' },
  { pattern: /xiaohongshu\.com|xhslink\.com/i, label: '小红书',    color: '#FF2442' },
  { pattern: /douyin\.com|tiktok\.com/i,     label: 'TikTok',       color: '#010101' },
  { pattern: /bilibili\.com/i,               label: 'Bilibili',     color: '#00A1D6' },
  { pattern: /twitter\.com|x\.com/i,         label: 'X / Twitter',  color: '#1DA1F2' },
  { pattern: /pinterest\.com/i,              label: 'Pinterest',    color: '#E60023' },
  { pattern: /reddit\.com/i,                 label: 'Reddit',       color: '#FF4500' },
  { pattern: /tripadvisor\./i,               label: 'TripAdvisor',  color: '#34E0A1' },
  { pattern: /google\.com\/maps/i,           label: 'Google Maps',  color: '#4285F4' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return { label: p.label, color: p.color };
  }
  return { label: 'Web', color: '#6366f1' };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showState(id) {
  const ids = ['notConfiguredState', 'noUrlState', 'mainView', 'successState'];
  for (const sid of ids) {
    const el = document.getElementById(sid);
    if (el) el.classList.toggle('active', sid === id);
  }
}

function buildShareUrl(panelUrl, url, title) {
  const base = panelUrl.replace(/\/$/, '');
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';
let panelUrl = '';

async function init() {
  try {
    const stored = await chrome.storage.sync.get(['panelUrl']);
    panelUrl = (stored.panelUrl || '').trim();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl   = tab?.url   || '';
    currentTitle = tab?.title || '';

    // Footer shows configured host
    const footerLink = document.getElementById('footerLink');
    if (panelUrl) {
      try {
        footerLink.textContent = new URL(panelUrl).hostname;
      } catch {
        footerLink.textContent = panelUrl;
      }
    }
    footerLink.addEventListener('click', () => {
      if (panelUrl) chrome.tabs.create({ url: panelUrl });
    });

    if (!panelUrl) {
      showState('notConfiguredState');
      document.getElementById('openSettingsBtn')
        .addEventListener('click', () => chrome.runtime.openOptionsPage());
      return;
    }

    if (!currentUrl || UNCLIPPABLE.test(currentUrl)) {
      showState('noUrlState');
      return;
    }

    // Main view
    showState('mainView');

    // Platform badge
    const { label, color } = detectPlatform(currentUrl);
    const badge = document.getElementById('platformBadge');
    badge.innerHTML = `
      <span class="platform-badge" style="background:${color}22;color:${color};">
        <span class="dot" style="background:${color}"></span>
        ${label}
      </span>`;

    // Page info
    document.getElementById('pageTitle').textContent =
      currentTitle || new URL(currentUrl).hostname;
    document.getElementById('pageUrl').textContent = currentUrl;

    // Clip button
    document.getElementById('clipBtn').addEventListener('click', clip);
  } catch (err) {
    console.error('[TravelPanel]', err);
  }
}

// ── Clip action ───────────────────────────────────────────────────────────────

async function clip() {
  const btn      = document.getElementById('clipBtn');
  const btnText  = document.getElementById('clipBtnText');
  const clipIcon = document.getElementById('clipIcon');

  btn.disabled = true;
  clipIcon.outerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" id="clipIcon"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/></svg>`;
  btnText.textContent = 'Opening TravelPanel…';

  try {
    const shareUrl = buildShareUrl(panelUrl, currentUrl, currentTitle);
    await chrome.tabs.create({ url: shareUrl });
    showSuccess();
  } catch (err) {
    btn.disabled = false;
    document.getElementById('clipBtnText').textContent = 'Try again';
    console.error('[TravelPanel]', err);
  }
}

// ── Success ───────────────────────────────────────────────────────────────────

function showSuccess() {
  const { label } = detectPlatform(currentUrl);
  const chips = [];
  if (label !== 'Web') chips.push(`📌 ${label}`);
  if (currentTitle) chips.push('🔍 Extracting spots & tips…');

  document.getElementById('infoChips').innerHTML =
    chips.map(c => `<span class="chip">${c}</span>`).join('');

  const successBody = document.getElementById('successBody');
  successBody.textContent = currentTitle
    ? `"${currentTitle.slice(0, 60)}${currentTitle.length > 60 ? '…' : ''}" is being processed.`
    : 'TravelPanel is extracting locations and travel wisdom from this page.';

  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: panelUrl });
  });

  showState('successState');
}

// ── Settings button ───────────────────────────────────────────────────────────

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Start ─────────────────────────────────────────────────────────────────────

init();
