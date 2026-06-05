// TravelPanel Clipper — popup logic

const SUBSTANCE_ICONS = {
  tip: '💡',
  warning: '⚠️',
  opinion: '💬',
  wisdom: '🧠',
  context: '🌍',
  recommendation: '⭐',
};

const DEFAULT_SERVER = 'https://your-travelpanel-app.vercel.app';

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let travelPanelUrl = DEFAULT_SERVER;
let extractionResult = null;
let extractionState = 'idle'; // idle | loading | success | error

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load settings
  const stored = await chrome.storage.sync.get({ travelPanelUrl: DEFAULT_SERVER });
  travelPanelUrl = stored.travelPanelUrl;
  updateFooter();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const url = tab?.url || '';

  // Hide UI for unsupported pages (chrome://, about:, etc.)
  if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
    $('main-content').classList.add('hidden');
    $('no-url').classList.remove('hidden');
    return;
  }

  // Populate page info
  $('page-title').textContent = tab.title || 'Untitled page';
  $('page-url').textContent = prettifyUrl(url);

  // Load favicon
  loadFavicon(url);

  // Wire up buttons
  $('extract-btn').addEventListener('click', handleExtractAndClip);
  $('settings-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// ─── Favicon ──────────────────────────────────────────────────────────────────

function loadFavicon(pageUrl) {
  try {
    const origin = new URL(pageUrl).origin;
    const faviconUrl = `${origin}/favicon.ico`;
    const img = $('favicon-img');
    img.src = faviconUrl;
    img.onload = () => {
      img.classList.remove('hidden');
      $('favicon-fallback').classList.add('hidden');
    };
    img.onerror = () => {
      // Keep fallback visible
    };
  } catch {
    // Keep fallback visible
  }
}

// ─── Extract & Clip ───────────────────────────────────────────────────────────

async function handleExtractAndClip() {
  const url = currentTab?.url;
  if (!url) return;

  // If we already succeeded, go straight to opening TravelPanel
  if (extractionState === 'success') {
    openInTravelPanel(url, extractionResult);
    return;
  }

  // Start extraction
  setExtractionState('loading');
  $('extract-btn').disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'extract',
      url,
      travelPanelUrl,
    });

    if (response?.ok && response.data) {
      extractionResult = response.data;
      setExtractionState('success');
      renderSuccess(response.data);
      $('extract-btn').innerHTML = '<span>📍</span> Save to TravelPanel';
      $('extract-btn').disabled = false;
    } else {
      const msg = response?.error || 'Unknown error from TravelPanel API';
      setExtractionState('error');
      $('error-text').textContent = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
      renderFallbackActions(url);
    }
  } catch (err) {
    setExtractionState('error');
    $('error-text').textContent = err.message || 'Could not reach TravelPanel. Check your server URL in Settings.';
    renderFallbackActions(url);
  }
}

function openInTravelPanel(url, data) {
  const params = new URLSearchParams({
    url,
    title: data?.title || currentTab?.title || '',
  });
  const shareUrl = `${travelPanelUrl.replace(/\/$/, '')}/share?${params}`;
  chrome.tabs.create({ url: shareUrl });
  window.close();
}

// ─── UI state helpers ─────────────────────────────────────────────────────────

function setExtractionState(state) {
  extractionState = state;
  const states = ['idle', 'loading', 'success', 'error'];
  states.forEach((s) => {
    $(`state-${s}`).classList.toggle('hidden', s !== state);
  });
}

function renderSuccess(data) {
  const chips = $('chips');
  chips.innerHTML = '';

  const locationCount = data.locations?.length || 0;
  const substanceCount = data.substance?.length || 0;
  const tagCount = data.tags?.length || 0;

  if (locationCount > 0) {
    chips.appendChild(makeChip('chip-locations', `📍 ${locationCount} spot${locationCount !== 1 ? 's' : ''}`));
  }
  if (substanceCount > 0) {
    chips.appendChild(makeChip('chip-substance', `💡 ${substanceCount} tip${substanceCount !== 1 ? 's' : ''}`));
  }
  if (tagCount > 0) {
    chips.appendChild(makeChip('chip-tags', `🏷️ ${tagCount} tag${tagCount !== 1 ? 's' : ''}`));
  }

  // Show up to 2 substance previews
  const preview = $('substance-preview');
  const items = data.substance?.slice(0, 2) || [];
  if (items.length > 0) {
    preview.innerHTML = items
      .map((s) => {
        const icon = SUBSTANCE_ICONS[s.type] || '💡';
        return `<div class="substance-item">
          <span class="substance-icon">${icon}</span>
          <span class="substance-text">${escapeHtml(s.content)}</span>
        </div>`;
      })
      .join('');
    preview.classList.remove('hidden');
  }
}

function renderFallbackActions(url) {
  const actions = $('actions');
  actions.innerHTML = `
    <button class="btn-primary" id="open-app-btn">
      <span>📍</span> Open in TravelPanel anyway
    </button>
    <button class="btn-secondary" id="retry-btn">↻ Retry extraction</button>
  `;
  $('open-app-btn').addEventListener('click', () => {
    openInTravelPanel(url, null);
  });
  $('retry-btn').addEventListener('click', () => {
    setExtractionState('idle');
    actions.innerHTML = `<button class="btn-primary" id="extract-btn"><span>🔍</span> Extract &amp; Clip</button>`;
    $('extract-btn').addEventListener('click', handleExtractAndClip);
  });
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function updateFooter() {
  const serverDisplay = travelPanelUrl === DEFAULT_SERVER
    ? '⚙️ Server not configured'
    : prettifyUrl(travelPanelUrl);
  $('footer-server').textContent = serverDisplay;
  $('footer-dot').className = 'footer-dot' + (travelPanelUrl !== DEFAULT_SERVER ? ' connected' : '');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeChip(className, text) {
  const el = document.createElement('span');
  el.className = `chip ${className}`;
  el.textContent = text;
  return el;
}

function prettifyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    return url.slice(0, 60);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
