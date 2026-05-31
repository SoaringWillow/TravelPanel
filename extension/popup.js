'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'http://localhost:3000';

const SUBSTANCE_META = {
  tip:            { emoji: '💡', label: 'Tips',            color: '#eab308' },
  warning:        { emoji: '⚠️', label: 'Warnings',        color: '#ef4444' },
  opinion:        { emoji: '💬', label: 'Opinions',         color: '#8b5cf6' },
  wisdom:         { emoji: '🧠', label: 'Wisdom',           color: '#06b6d4' },
  context:        { emoji: '🌍', label: 'Context',          color: '#22c55e' },
  recommendation: { emoji: '⭐', label: 'Recommendations',  color: '#f59e0b' },
};

const PLATFORM_META = {
  xiaohongshu: { label: 'Xiaohongshu', bg: '#ff2442', color: '#fff' },
  douyin:      { label: 'Douyin',      bg: '#00f2ea', color: '#000' },
  bilibili:    { label: 'Bilibili',    bg: '#fb7299', color: '#fff' },
  wechat:      { label: 'WeChat',      bg: '#07c160', color: '#fff' },
  other:       { label: 'Web',         bg: '#6366f1', color: '#fff' },
};

// ── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let lastResult = null;

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const urlText = document.getElementById('urlText');
  urlText.textContent = currentTab?.url || 'Unknown page';

  const appUrl = await getAppUrl();

  if (!appUrl) {
    document.getElementById('unconfiguredWarning').classList.remove('hidden');
    document.getElementById('clipBtn').disabled = true;
    document.getElementById('clipBtn').style.opacity = '0.5';
  }

  document.getElementById('clipBtn').addEventListener('click', clip);
  document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('configureNow')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('retryBtn').addEventListener('click', clip);
  document.getElementById('directSaveBtn').addEventListener('click', openInTravelPanel);
  document.getElementById('saveBtn').addEventListener('click', openInTravelPanel);
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

// ── Main clip action ──────────────────────────────────────────────────────────

async function clip() {
  if (!currentTab?.url) return;

  const appUrl = await getAppUrl();
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  showState('loading');

  try {
    const res = await fetch(`${appUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentTab.url }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}. Is TravelPanel running at ${appUrl}?`);
    }

    lastResult = await res.json();
    renderPreview(lastResult);
    showState('preview');
  } catch (err) {
    document.getElementById('errorMsg').textContent =
      err.message || 'Could not connect to TravelPanel. Check your settings.';
    showState('error');
  }
}

// ── Open in TravelPanel ───────────────────────────────────────────────────────

async function openInTravelPanel() {
  const appUrl = await getAppUrl();
  const url = encodeURIComponent(currentTab?.url || '');
  const title = encodeURIComponent(currentTab?.title || lastResult?.title || '');
  chrome.tabs.create({ url: `${appUrl}/share?url=${url}&title=${title}` });
  window.close();
}

// ── Render preview ────────────────────────────────────────────────────────────

function renderPreview(data) {
  // Platform badge
  const pm = PLATFORM_META[data.platform] || PLATFORM_META.other;
  const badge = document.getElementById('platformBadge');
  badge.textContent = pm.label;
  badge.style.background = pm.bg;
  badge.style.color = pm.color;

  // Title + description
  document.getElementById('previewTitle').textContent = data.title || currentTab?.title || 'Untitled';
  document.getElementById('previewDesc').textContent = data.description || '';

  // Stats
  document.getElementById('locNum').textContent = data.locations?.length ?? 0;
  document.getElementById('subNum').textContent = data.substance?.length ?? 0;
  document.getElementById('actNum').textContent = data.activities?.length ?? 0;

  // Sections
  const container = document.getElementById('sections');
  container.innerHTML = '';

  // Locations block
  if (data.locations?.length) {
    container.appendChild(buildLocationsBlock(data.locations));
  }

  // Substance blocks (grouped by type)
  if (data.substance?.length) {
    const grouped = groupBy(data.substance, s => s.type);
    const order = ['tip', 'warning', 'recommendation', 'wisdom', 'opinion', 'context'];
    order.forEach(type => {
      if (grouped[type]?.length) {
        container.appendChild(buildSubstanceBlock(type, grouped[type]));
      }
    });
  }

  // Activities block
  if (data.activities?.length) {
    container.appendChild(buildActivitiesBlock(data.activities));
  }
}

function buildLocationsBlock(locations) {
  const block = document.createElement('div');
  block.className = 'section-block';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `📍 Places <span class="section-count">${locations.length}</span>`;
  block.appendChild(header);

  const items = document.createElement('div');
  items.className = 'section-items';
  locations.slice(0, 6).forEach(loc => {
    const el = document.createElement('div');
    el.className = 'loc-item';
    el.innerHTML = `<div class="loc-dot"></div><span>${esc(loc.name)}</span>`;
    items.appendChild(el);
  });
  if (locations.length > 6) {
    const more = document.createElement('div');
    more.className = 'loc-item';
    more.style.color = 'var(--muted)';
    more.textContent = `+${locations.length - 6} more`;
    items.appendChild(more);
  }
  block.appendChild(items);
  return block;
}

function buildSubstanceBlock(type, items) {
  const meta = SUBSTANCE_META[type] || { emoji: '•', label: type, color: '#94a3b8' };
  const block = document.createElement('div');
  block.className = 'section-block';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.style.color = meta.color;
  header.innerHTML = `${meta.emoji} ${meta.label} <span class="section-count">${items.length}</span>`;
  block.appendChild(header);

  const container = document.createElement('div');
  container.className = 'section-items';
  items.slice(0, 4).forEach(item => {
    const el = document.createElement('div');
    el.className = 'substance-item';
    el.innerHTML = `<div class="substance-content">${esc(item.content)}</div>`;
    if (item.source_quote) {
      const quote = document.createElement('div');
      quote.className = 'substance-quote';
      quote.textContent = `"${item.source_quote}"`;
      el.appendChild(quote);
    }
    container.appendChild(el);
  });
  if (items.length > 4) {
    const more = document.createElement('div');
    more.className = 'substance-item';
    more.style.color = 'var(--muted)';
    more.style.fontSize = '11px';
    more.textContent = `+${items.length - 4} more insights`;
    container.appendChild(more);
  }
  block.appendChild(container);
  return block;
}

function buildActivitiesBlock(activities) {
  const block = document.createElement('div');
  block.className = 'section-block';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `🎯 Activities <span class="section-count">${activities.length}</span>`;
  block.appendChild(header);

  const items = document.createElement('div');
  items.className = 'section-items';
  activities.slice(0, 4).forEach(act => {
    const el = document.createElement('div');
    el.className = 'loc-item';
    el.innerHTML = `<div class="loc-dot" style="background:var(--success)"></div><span>${esc(act)}</span>`;
    items.appendChild(el);
  });
  if (activities.length > 4) {
    const more = document.createElement('div');
    more.className = 'loc-item';
    more.style.color = 'var(--muted)';
    more.textContent = `+${activities.length - 4} more`;
    items.appendChild(more);
  }
  block.appendChild(items);
  return block;
}

// ── State switcher ────────────────────────────────────────────────────────────

function showState(name) {
  ['idle', 'loading', 'preview', 'error'].forEach(s => {
    document.getElementById(`s-${s}`).classList.toggle('active', s === name);
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
