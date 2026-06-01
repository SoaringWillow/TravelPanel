'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://your-travelpanel-app.vercel.app';

const SUBSTANCE_ICONS = {
  tip: '💡',
  warning: '⚠️',
  opinion: '💬',
  wisdom: '🧠',
  context: '🌍',
  recommendation: '⭐',
};

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

// ── State ─────────────────────────────────────────────────────────────────────

let currentUrl = '';
let currentTitle = '';
let currentExtraction = null;
let appUrl = DEFAULT_APP_URL;
let lastClippedUrl = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const states = {
  idle: $('idleState'),
  loading: $('loadingState'),
  preview: $('previewState'),
  done: $('doneState'),
  error: $('errorState'),
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function showState(name) {
  Object.values(states).forEach((el) => el.classList.add('hidden'));
  states[name].classList.remove('hidden');
}

function pluralize(n, word) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

async function getStoredAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve((result.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

async function getSessionCount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sessionClips'], (result) => {
      resolve(result.sessionClips || 0);
    });
  });
}

async function incrementSessionCount() {
  const count = await getSessionCount();
  chrome.storage.local.set({ sessionClips: count + 1 });
  return count + 1;
}

// ── Page info ─────────────────────────────────────────────────────────────────

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentUrl = tab.url || '';
  currentTitle = tab.title || '';

  // Update UI
  $('pageTitle').textContent = currentTitle || currentUrl;
  $('pageUrl').textContent = currentUrl;

  // Try to load favicon
  if (tab.favIconUrl) {
    const img = document.createElement('img');
    img.className = 'page-favicon';
    img.src = tab.favIconUrl;
    img.onerror = () => {}; // keep placeholder on error
    img.onload = () => {
      const container = $('faviconContainer');
      container.className = '';
      container.innerHTML = '';
      container.appendChild(img);
    };
  }

  // Set open app link
  $('openAppBtn').href = appUrl;
  $('openAppBtn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
}

// ── Session count UI ──────────────────────────────────────────────────────────

async function updateSessionCountUI() {
  const count = await getSessionCount();
  if (count > 0) {
    $('sessionCountWrap').style.display = '';
    $('sessionCount').textContent = count;
  }
}

// ── Extraction ────────────────────────────────────────────────────────────────

async function extractUrl(url) {
  const response = await fetch(`${appUrl}/api/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension': 'travelpanel-clipper',
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text.slice(0, 100)}`);
  }

  return response.json();
}

// ── Preview rendering ─────────────────────────────────────────────────────────

function renderPreview(data, originalTitle) {
  // Title
  $('previewTitle').textContent = data.title || originalTitle || 'Untitled';

  // Platform badge
  const platform = data.platform || 'other';
  $('previewPlatform').textContent = PLATFORM_LABELS[platform] || platform;

  // Stats
  const locCount = (data.locations || []).length;
  const subCount = (data.substance || []).length;
  $('locationsLabel').textContent = pluralize(locCount, 'location');
  $('substanceLabel').textContent = pluralize(subCount, 'tip');

  // Location list (show up to 4)
  const locationsList = $('locationsList');
  locationsList.innerHTML = '';
  const visible = (data.locations || []).slice(0, 4);
  visible.forEach((loc) => {
    const item = document.createElement('div');
    item.className = 'location-item';
    item.textContent = loc.name;
    locationsList.appendChild(item);
  });
  if (locCount > 4) {
    const more = document.createElement('div');
    more.className = 'more-locations';
    more.textContent = `+${locCount - 4} more locations`;
    locationsList.appendChild(more);
  }

  // Substance preview (show first substantive item)
  const substances = data.substance || [];
  const firstSub = substances.find((s) => s.content) || substances[0];
  if (firstSub) {
    $('substancePreviewIcon').textContent = SUBSTANCE_ICONS[firstSub.type] || '💡';
    $('substancePreviewText').textContent = firstSub.content;
    $('substancePreview').style.display = '';
  } else {
    $('substancePreview').style.display = 'none';
  }
}

// ── Save flow ─────────────────────────────────────────────────────────────────

function openSharePage(url, title) {
  const params = new URLSearchParams();
  params.set('url', url);
  if (title) params.set('title', title);
  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
}

async function handleSave() {
  const url = lastClippedUrl;
  const title = currentExtraction?.title || currentTitle;

  // Update done state
  const locCount = (currentExtraction?.locations || []).length;
  const subCount = (currentExtraction?.substance || []).length;

  if (locCount > 0 || subCount > 0) {
    $('doneLocations').textContent = `📍 ${pluralize(locCount, 'location')}`;
    $('doneSubstance').textContent = `💡 ${pluralize(subCount, 'tip')}`;
    $('doneStats').style.display = '';
  }

  $('doneSub').textContent = 'Opening TravelPanel to choose a board…';
  showState('done');

  // Increment counter
  await incrementSessionCount();

  // Open share page after a short delay so user sees the success state
  setTimeout(() => {
    openSharePage(url, title);
    window.close();
  }, 800);
}

// ── Clip flow ─────────────────────────────────────────────────────────────────

async function clipUrl(url, title) {
  if (!url) return;

  lastClippedUrl = url;
  showState('loading');

  try {
    const data = await extractUrl(url);
    currentExtraction = data;
    renderPreview(data, title);
    showState('preview');
  } catch (err) {
    console.error('TravelPanel extraction error:', err);
    $('errorSub').textContent = err.message.includes('API error')
      ? `API returned an error. Is TravelPanel running at ${appUrl}?`
      : err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
        ? `Could not connect to TravelPanel at ${appUrl}. Check your settings.`
        : `Error: ${err.message.slice(0, 120)}`;
    showState('error');
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

$('clipBtn').addEventListener('click', () => {
  clipUrl(currentUrl, currentTitle);
});

$('clipCustomBtn').addEventListener('click', () => {
  const url = $('customUrl').value.trim();
  if (!url) {
    $('customUrl').classList.add('error');
    $('customUrl').focus();
    return;
  }
  $('customUrl').classList.remove('error');
  clipUrl(url, '');
});

$('customUrl').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('clipCustomBtn').click();
});

$('customUrl').addEventListener('input', () => {
  $('customUrl').classList.remove('error');
});

$('saveBtn').addEventListener('click', handleSave);

$('cancelBtn').addEventListener('click', () => {
  currentExtraction = null;
  showState('idle');
});

$('retryBtn').addEventListener('click', () => {
  clipUrl(lastClippedUrl, currentTitle);
});

$('errorCancelBtn').addEventListener('click', () => {
  showState('idle');
});

$('doneCloseBtn').addEventListener('click', () => {
  window.close();
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  appUrl = await getStoredAppUrl();
  await Promise.all([loadCurrentTab(), updateSessionCountUI()]);
}

init().catch(console.error);
