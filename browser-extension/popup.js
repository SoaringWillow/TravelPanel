// TravelPanel Clipper — popup logic

const SUBSTANCE_ICONS = {
  tip: '💡',
  warning: '⚠️',
  opinion: '💬',
  wisdom: '🧠',
  context: '🌍',
  recommendation: '⭐',
};

const PLATFORM_LABELS = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  bilibili: 'Bilibili',
  wechat: 'WeChat',
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  other: 'Web',
};

let currentUrl = '';
let extracted = null;
let travelPanelUrl = '';

// ── Helpers ────────────────────────────────────────────────

function show(id) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Init ───────────────────────────────────────────────────

async function init() {
  show('s-loading');

  const { travelPanelUrl: saved } = await chrome.storage.sync.get(['travelPanelUrl']);
  travelPanelUrl = (saved || '').replace(/\/$/, '');

  if (!travelPanelUrl) {
    show('s-unconfigured');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url || '';

  const blocked = !currentUrl
    || currentUrl.startsWith('chrome://')
    || currentUrl.startsWith('chrome-extension://')
    || currentUrl.startsWith('about:')
    || currentUrl.startsWith('edge://');

  if (blocked) {
    document.getElementById('unconf-title').textContent = 'Cannot clip this page';
    document.getElementById('unconf-msg').textContent = 'Navigate to a travel page and click the extension icon.';
    document.getElementById('openSettingsBtn').style.display = 'none';
    show('s-unconfigured');
    return;
  }

  document.getElementById('urlText').textContent = currentUrl;
  show('s-idle');
}

// ── Extract ────────────────────────────────────────────────

async function startExtraction() {
  show('s-extracting');

  // Reset progress bar animation
  const bar = document.querySelector('.progress-bar');
  bar.style.animation = 'none';
  void bar.offsetWidth; // reflow
  bar.style.animation = '';

  try {
    const res = await fetch(`${travelPanelUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server returned ${res.status}`);
    }

    extracted = await res.json();
    renderPreview(extracted);
    show('s-preview');
  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? 'Request timed out. The server may be slow or the page too complex.'
      : (err.message || 'Unknown error occurred');
    document.getElementById('errMsg').textContent = msg;
    show('s-error');
  }
}

// ── Render preview ─────────────────────────────────────────

function renderPreview(data) {
  // Thumbnail
  if (data.thumbnail) {
    document.getElementById('thumbImg').src = data.thumbnail;
    document.getElementById('thumbImg').onerror = () =>
      document.getElementById('thumb').classList.add('hidden');
    document.getElementById('thumb').classList.remove('hidden');
  } else {
    document.getElementById('thumb').classList.add('hidden');
  }

  // Platform + title + description
  document.getElementById('platBadge').textContent =
    PLATFORM_LABELS[data.platform] || 'Web';
  document.getElementById('prevTitle').textContent = data.title || 'Untitled';
  document.getElementById('prevDesc').textContent = data.description || '';

  // Locations
  const locs = data.locations || [];
  if (locs.length) {
    document.getElementById('locsSection').classList.remove('hidden');
    document.getElementById('locsCount').textContent = locs.length;
    document.getElementById('locsList').innerHTML =
      locs.slice(0, 6).map(l => `<span class="loc-tag">📍 ${esc(l.name)}</span>`).join('') +
      (locs.length > 6 ? `<span class="loc-tag">+${locs.length - 6} more</span>` : '');
  } else {
    document.getElementById('locsSection').classList.add('hidden');
  }

  // Substance
  const subs = data.substance || [];
  if (subs.length) {
    document.getElementById('subSection').classList.remove('hidden');
    document.getElementById('subCount').textContent = subs.length;
    document.getElementById('subList').innerHTML =
      subs.slice(0, 4).map(s => `
        <div class="sub-item type-${esc(s.type)}">
          <div class="sub-type">${SUBSTANCE_ICONS[s.type] || ''} ${esc(s.type)}</div>
          <div class="sub-content">${esc(s.content)}</div>
        </div>
      `).join('') +
      (subs.length > 4
        ? `<div class="sub-item"><div class="sub-content" style="color:#475569;font-style:italic">+${subs.length - 4} more insights</div></div>`
        : '');
  } else {
    document.getElementById('subSection').classList.add('hidden');
  }
}

// ── Save ───────────────────────────────────────────────────

function openTravelPanel(data) {
  const params = new URLSearchParams({
    url: currentUrl,
    title: (data && data.title) || currentUrl,
  });

  if (data) {
    // Pass pre-extracted data so the share page skips the API call
    params.set('ext', JSON.stringify(data));
  }

  chrome.tabs.create({ url: `${travelPanelUrl}/share?${params.toString()}` });
  window.close();
}

function summarize(data) {
  const l = (data?.locations || []).length;
  const s = (data?.substance || []).length;
  if (l && s) return `${l} location${l !== 1 ? 's' : ''} · ${s} tip${s !== 1 ? 's' : ''}`;
  if (l) return `${l} location${l !== 1 ? 's' : ''} found`;
  if (s) return `${s} tip${s !== 1 ? 's' : ''} found`;
  return 'URL saved for later';
}

// ── Event listeners ────────────────────────────────────────

document.getElementById('clipBtn').addEventListener('click', startExtraction);
document.getElementById('retryBtn').addEventListener('click', startExtraction);

document.getElementById('saveBtn').addEventListener('click', () => {
  document.getElementById('savedSummary').textContent = summarize(extracted);
  show('s-saved');
  openTravelPanel(extracted);
});

document.getElementById('saveUrlBtn').addEventListener('click', () => {
  document.getElementById('savedSummary').textContent = 'URL saved for later';
  show('s-saved');
  openTravelPanel(null);
});

document.getElementById('cancelBtn').addEventListener('click', () => show('s-idle'));

document.getElementById('clipAnotherBtn').addEventListener('click', () => {
  extracted = null;
  show('s-idle');
});

document.getElementById('settingsBtn').addEventListener('click', () =>
  chrome.runtime.openOptionsPage()
);

document.getElementById('openSettingsBtn').addEventListener('click', () =>
  chrome.runtime.openOptionsPage()
);

// ── Boot ───────────────────────────────────────────────────

init();
