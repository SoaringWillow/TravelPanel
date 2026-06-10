const DEFAULT_PANEL_URL = 'https://travelpanel.vercel.app';

const titleEl       = document.getElementById('page-title');
const urlEl         = document.getElementById('page-url');
const thumbnailImg  = document.getElementById('thumbnail');
const placeholder   = document.getElementById('thumbnail-placeholder');
const clipBtn       = document.getElementById('clip-btn');
const statusMsg     = document.getElementById('status-msg');
const panelDisplay  = document.getElementById('panel-url-display');
const changeUrlLink = document.getElementById('change-url');
const optionsLink   = document.getElementById('options-link');

let currentMeta = null;
let panelUrl    = DEFAULT_PANEL_URL;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.sync.get('panelUrl');
  panelUrl = (stored.panelUrl || DEFAULT_PANEL_URL).replace(/\/$/, '');
  panelDisplay.textContent = shortenUrl(panelUrl);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showError('No active tab found.'); return; }

    // Try content script first (richer OG metadata)
    let meta = null;
    try {
      meta = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' });
    } catch {
      // Content script not injected yet — fall back to tab data
    }

    currentMeta = meta || {
      url:   tab.url || '',
      title: tab.title || '',
      description: '',
      thumbnail: '',
    };

    renderMeta(currentMeta);
    clipBtn.disabled = false;
  } catch (err) {
    showError('Could not read page info.');
    console.error(err);
  }
}

// ── Render page metadata ──────────────────────────────────────────────────────

function renderMeta(meta) {
  titleEl.textContent = meta.title || meta.url;
  urlEl.textContent   = formatHostname(meta.url);

  if (meta.thumbnail) {
    thumbnailImg.src = meta.thumbnail;
    thumbnailImg.onload  = () => { thumbnailImg.classList.remove('hidden'); placeholder.classList.add('hidden'); };
    thumbnailImg.onerror = () => { /* keep placeholder */ };
  }
}

// ── Clip button ───────────────────────────────────────────────────────────────

clipBtn.addEventListener('click', () => {
  if (!currentMeta) return;

  const shareUrl =
    `${panelUrl}/share` +
    `?url=${encodeURIComponent(currentMeta.url)}` +
    `&title=${encodeURIComponent(currentMeta.title || '')}` +
    `&source=extension`;

  chrome.windows.create({
    url:     shareUrl,
    type:    'popup',
    width:   440,
    height:  580,
    focused: true,
  });

  // Visual feedback
  clipBtn.classList.add('success');
  clipBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
    Clip window opened!
  `;

  setTimeout(() => window.close(), 1200);
});

// ── Footer links ──────────────────────────────────────────────────────────────

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

changeUrlLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function showError(msg) {
  statusMsg.textContent = msg;
  statusMsg.classList.add('visible');
  titleEl.textContent   = 'Unable to clip';
}

function formatHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function shortenUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

init();
