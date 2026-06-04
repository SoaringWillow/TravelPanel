// ─── State ───────────────────────────────────────────────────────────────────

let currentTab = null;
let travelPanelUrl = '';
let clipState = 'idle'; // idle | loading | done | error

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Wire buttons
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('go-settings-btn').addEventListener('click', openSettings);
  document.getElementById('clip-btn').addEventListener('click', onClip);
  document.getElementById('open-tp-btn').addEventListener('click', openTravelPanel);

  // Load config + current tab in parallel
  const [tab, stored] = await Promise.all([
    getActiveTab(),
    chrome.storage.sync.get(['travelPanelUrl']),
  ]);

  currentTab = tab;
  travelPanelUrl = (stored.travelPanelUrl || '').replace(/\/$/, '');

  if (!travelPanelUrl) {
    showSetupPrompt();
    return;
  }

  renderPageInfo(tab);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

function openTravelPanel() {
  if (!travelPanelUrl) { openSettings(); return; }
  chrome.tabs.create({ url: travelPanelUrl });
  window.close();
}

function showSetupPrompt() {
  document.getElementById('page-info').classList.add('hidden');
  document.getElementById('action-area').classList.add('hidden');
  document.querySelector('.footer').classList.add('hidden');
  document.getElementById('setup-prompt').classList.remove('hidden');
}

function renderPageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const urlEl   = document.getElementById('page-url');
  titleEl.textContent = tab?.title || 'Untitled Page';
  urlEl.textContent   = tab?.url   || '';
  titleEl.title = tab?.title || '';
  urlEl.title   = tab?.url   || '';
}

// ─── Main clip action ─────────────────────────────────────────────────────────

async function onClip() {
  if (clipState === 'loading') return;
  clipState = 'loading';

  const clipBtn = document.getElementById('clip-btn');
  const resultsArea = document.getElementById('results-area');

  clipBtn.disabled = true;
  clipBtn.innerHTML = `<span class="spinner"></span> Extracting insights…`;
  resultsArea.style.display = 'block';

  setResults([
    { icon: 'spinner', text: 'Connecting to TravelPanel…', kind: 'spinning' },
  ]);

  try {
    const response = await fetch(`${travelPanelUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentTab.url }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    clipState = 'done';

    // Build result rows
    const rows = [
      {
        icon: '✓',
        text: result.locations.length > 0
          ? `${result.locations.length} location${result.locations.length !== 1 ? 's' : ''} found`
          : 'No specific locations detected',
        kind: result.locations.length > 0 ? 'done' : 'info',
      },
      {
        icon: '✓',
        text: result.substance.length > 0
          ? `${result.substance.length} insight${result.substance.length !== 1 ? 's' : ''} extracted`
          : 'No substance items extracted',
        kind: result.substance.length > 0 ? 'done' : 'info',
      },
    ];

    if (result.title) {
      rows.push({ icon: '📄', text: truncate(result.title, 48), kind: 'info' });
    }

    setResults(rows);

    // Show tags
    if (result.tags && result.tags.length > 0) {
      renderTags(result.tags.slice(0, 6));
    }

    // Encode result for auto-save in TravelPanel
    const autoClipData = btoa(unescape(encodeURIComponent(JSON.stringify(result))));
    const saveUrl = `${travelPanelUrl}/?autoClip=${encodeURIComponent(autoClipData)}&source=${encodeURIComponent(currentTab.url)}`;

    clipBtn.disabled = false;
    clipBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      View in TravelPanel
    `;
    clipBtn.onclick = () => {
      chrome.tabs.create({ url: saveUrl });
      window.close();
    };

  } catch (err) {
    clipState = 'error';
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';

    setResults([
      {
        icon: '✗',
        text: isTimeout
          ? 'Request timed out — TravelPanel may be slow to respond'
          : 'Could not reach TravelPanel. Check your settings.',
        kind: 'error',
      },
    ]);

    // Fallback: open TravelPanel with ?import= so it re-extracts
    clipBtn.disabled = false;
    clipBtn.innerHTML = '↗ Open in TravelPanel';
    clipBtn.onclick = () => {
      chrome.tabs.create({
        url: `${travelPanelUrl}/?import=${encodeURIComponent(currentTab.url)}`,
      });
      window.close();
    };
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function setResults(rows) {
  const area = document.getElementById('results-area');
  area.innerHTML = rows.map(({ icon, text, kind }) => {
    const iconHtml = icon === 'spinner'
      ? '<span class="spinner"></span>'
      : `<span class="result-icon">${icon}</span>`;
    return `<div class="result-row ${kind}">${iconHtml}<span>${escapeHtml(text)}</span></div>`;
  }).join('');
}

function renderTags(tags) {
  const area = document.getElementById('tags-area');
  area.className = 'tags-strip';
  area.innerHTML = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
}

function truncate(str, n) {
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
