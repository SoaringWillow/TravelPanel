// ─── Platform detection ────────────────────────────────────────────────────

const PLATFORMS = {
  xiaohongshu: {
    label: 'Xiaohongshu',
    color: '#FF2442',
    test: (u) => /xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(u),
  },
  wechat: {
    label: 'WeChat',
    color: '#07C160',
    test: (u) => /weixin\.qq\.com|mp\.weixin/i.test(u),
  },
  douyin: {
    label: 'Douyin',
    color: '#00f2ea',
    test: (u) => /douyin\.com|iesdouyin\.com|tiktok\.com/i.test(u),
  },
  bilibili: {
    label: 'Bilibili',
    color: '#00AEEC',
    test: (u) => /bilibili\.com|b23\.tv/i.test(u),
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    test: (u) => /youtube\.com|youtu\.be/i.test(u),
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    test: (u) => /instagram\.com/i.test(u),
  },
};

function detectPlatform(url) {
  for (const [key, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.test(url)) return { key, ...cfg };
  }
  return { key: 'other', label: 'Web', color: '#6366f1', test: () => true };
}

// ─── DOM helpers ──────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function show(id)  { $(id).style.display = ''; }
function hide(id)  { $(id).style.display = 'none'; }
function text(id, val) { $(id).textContent = val; }

function showError(msg) {
  text('errorText', msg);
  show('errorBanner');
}

function hideError() { hide('errorBanner'); }

// ─── State ────────────────────────────────────────────────────────────────

let currentUrl   = '';
let currentTitle = '';
let previewData  = null;
let appUrl       = '';

// ─── Init ─────────────────────────────────────────────────────────────────

async function init() {
  // Load stored app URL
  const stored = await chrome.storage.sync.get(['appUrl']);
  appUrl = (stored.appUrl || '').replace(/\/$/, '');

  if (!appUrl) {
    hide('urlCard');
    hide('actions');
    show('setupNotice');
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showError('Could not read the current tab URL.');
    return;
  }

  currentUrl   = tab.url;
  currentTitle = tab.title || '';

  // Render URL card
  const platform = detectPlatform(currentUrl);
  $('platformDot').style.background  = platform.color;
  text('platformLabel', platform.label);
  text('urlText', truncateUrl(currentUrl, 42));
  text('pageTitle', currentTitle);
}

function truncateUrl(url, max) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.slice(0, max);
  }
}

// ─── Quick Clip ───────────────────────────────────────────────────────────

$('quickClipBtn').addEventListener('click', () => {
  hideError();
  openSharePage(currentUrl, currentTitle);
  showSuccess();
});

function openSharePage(url, title) {
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
}

// ─── Preview & Clip ───────────────────────────────────────────────────────

$('previewBtn').addEventListener('click', async () => {
  if (!currentUrl) return;
  hideError();
  hide('actions');
  show('loading');

  try {
    const result = await fetchPreview(currentUrl);
    previewData = result;
    renderPreview(result);
    hide('loading');
    show('previewResults');
  } catch (err) {
    hide('loading');
    show('actions');
    showError(err.message || 'Preview failed. Try Quick Clip instead.');
  }
});

async function fetchPreview(url) {
  const endpoint = `${appUrl}/api/import`;

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error('Could not reach TravelPanel. Is the app running?');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `API error ${res.status}`);
  }

  return res.json();
}

function renderPreview(data) {
  const grid = $('resultsGrid');
  grid.innerHTML = '';

  const locCount = data.locations?.length ?? 0;
  const subCount = data.substance?.length ?? 0;
  const tags     = data.tags ?? [];

  grid.appendChild(resultRow('📍', `Location${locCount !== 1 ? 's' : ''} found`, locCount));
  grid.appendChild(resultRow('💡', `Tips & insights`, subCount));

  if (tags.length > 0) {
    const tagsEl = document.createElement('div');
    tagsEl.className = 'tags-row';
    tags.slice(0, 6).forEach((tag) => {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = tag;
      tagsEl.appendChild(t);
    });
    grid.appendChild(tagsEl);
  }
}

function resultRow(icon, label, count) {
  const row = document.createElement('div');
  row.className = 'result-row';
  row.innerHTML = `
    <span class="result-icon">${icon}</span>
    <span class="result-label">${label}</span>
    <span class="result-count">${count}</span>
  `;
  return row;
}

// ─── Save (after preview) ─────────────────────────────────────────────────

$('saveBtn').addEventListener('click', () => {
  hideError();
  openSharePage(currentUrl, currentTitle);
  showSuccess();
});

// ─── Success state ────────────────────────────────────────────────────────

function showSuccess() {
  hide('urlCard');
  hide('actions');
  hide('previewResults');
  hide('loading');
  show('success');
  setTimeout(() => window.close(), 2000);
}

// ─── Settings ─────────────────────────────────────────────────────────────

$('optionsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('setupBtn')  ?.addEventListener('click', () => chrome.runtime.openOptionsPage());

// ─── Boot ────────────────────────────────────────────────────────────────

init().catch((err) => showError(err.message));
