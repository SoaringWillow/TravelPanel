/* TravelPanel Clipper — Popup */

const DEFAULT_URL = 'http://localhost:3000';
const API_TIMEOUT_MS = 15_000;

let currentTab = null;
let baseUrl = DEFAULT_URL;
let extractedData = null;

// ── Initialization ─────────────────────────────────────────────────────────

async function init() {
  try {
    const stored = await chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL });
    baseUrl = stored.travelpanelUrl.replace(/\/$/, '');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    renderPageInfo(tab);

    if (isClippableUrl(tab.url)) {
      await runExtraction(tab.url);
    } else {
      showError('This page type cannot be clipped.');
      enableSave();
    }
  } catch (err) {
    showError('Extension error. Check your TravelPanel URL in settings.');
    enableSave();
  }
}

function isClippableUrl(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

// ── Page info ──────────────────────────────────────────────────────────────

function renderPageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const domainEl = document.getElementById('page-domain');
  const faviconEl = document.getElementById('favicon');

  titleEl.textContent = tab.title || 'Untitled page';
  titleEl.title = tab.title || '';

  try {
    const u = new URL(tab.url);
    domainEl.textContent = u.hostname.replace(/^www\./, '');
  } catch {
    domainEl.textContent = tab.url || '';
  }

  if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.onerror = () => { faviconEl.src = 'icons/icon16.png'; };
  }
}

// ── Extraction preview ─────────────────────────────────────────────────────

async function runExtraction(url) {
  const loadingEl = document.getElementById('loading-state');
  const previewEl = document.getElementById('preview-result');
  const errorEl = document.getElementById('error-state');

  loadingEl.classList.remove('hidden');
  previewEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 429) {
      showError('Rate limit reached. Try again in a moment.');
      enableSave();
      return;
    }

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    extractedData = await response.json();
    loadingEl.classList.add('hidden');
    renderPreview(extractedData);
    enableSave();
  } catch (err) {
    loadingEl.classList.add('hidden');
    if (err.name === 'AbortError') {
      showError('Request timed out — you can still save the URL.');
    } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError(`Can't reach TravelPanel at ${baseUrl}. Check Settings.`);
    } else {
      showError('Could not analyze this page — saving as bookmark.');
    }
    enableSave();
  }
}

function renderPreview(data) {
  const previewEl = document.getElementById('preview-result');
  const locCount = (data.locations || []).length;
  const subCount = (data.substance || []).length;
  const tags = (data.tags || []).slice(0, 4);

  const parts = [];

  if (locCount > 0 || subCount > 0) {
    const chips = [];
    if (locCount > 0) {
      chips.push(`
        <div class="stat-chip location">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${locCount} location${locCount !== 1 ? 's' : ''}
        </div>
      `);
    }
    if (subCount > 0) {
      chips.push(`
        <div class="stat-chip insight">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${subCount} insight${subCount !== 1 ? 's' : ''}
        </div>
      `);
    }
    parts.push(`<div class="stats-row">${chips.join('')}</div>`);
  }

  if (tags.length > 0) {
    const tagHtml = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    parts.push(`<div class="tags-row">${tagHtml}</div>`);
  }

  if (parts.length === 0) {
    parts.push('<p class="no-travel">No travel content detected — saving as bookmark.</p>');
  }

  previewEl.innerHTML = parts.join('');
  previewEl.classList.remove('hidden');
}

function showError(message) {
  const errorEl = document.getElementById('error-state');
  document.getElementById('error-message').textContent = message;
  errorEl.classList.remove('hidden');
}

function enableSave() {
  document.getElementById('save-btn').disabled = false;
}

// ── Save action ────────────────────────────────────────────────────────────

function saveToTravelPanel() {
  if (!currentTab) return;

  const saveBtn = document.getElementById('save-btn');
  saveBtn.classList.add('saving');
  saveBtn.textContent = 'Opening TravelPanel…';

  const params = new URLSearchParams({
    url: currentTab.url,
    title: currentTab.title || '',
  });

  chrome.windows.create(
    {
      url: `${baseUrl}/share?${params.toString()}`,
      type: 'popup',
      width: 420,
      height: 620,
      focused: true,
    },
    () => {
      window.close();
    }
  );
}

// ── Utilities ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ────────────────────────────────────────────────────────

document.getElementById('save-btn').addEventListener('click', saveToTravelPanel);

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Boot ───────────────────────────────────────────────────────────────────

init();
