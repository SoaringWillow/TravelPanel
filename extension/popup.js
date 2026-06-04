'use strict';

// ── Storage keys ─────────────────────────────────────────────────
const KEY_APP_URL   = 'travelpanel_app_url';
const KEY_CLIPS     = 'travelpanel_recent_clips';
const MAX_RECENT    = 5;

// ── Helpers ───────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showScreen(name) {
  ['setup-screen', 'main-screen', 'settings-screen', 'success-screen'].forEach(id => {
    $(id).classList.add('hidden');
  });
  $(`${name}-screen`).classList.remove('hidden');
}

function getFavicon(tabUrl) {
  try {
    const origin = new URL(tabUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    return url.slice(0, 50);
  }
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function normalizeAppUrl(raw) {
  let url = raw.trim().replace(/\/$/, '');
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

// ── Recent clips ──────────────────────────────────────────────────

function loadRecentClips() {
  chrome.storage.local.get([KEY_CLIPS], ({ [KEY_CLIPS]: clips = [] }) => {
    if (!clips.length) { $('recent-section').classList.add('hidden'); return; }
    $('recent-section').classList.remove('hidden');
    const list = $('recent-list');
    list.innerHTML = '';
    clips.slice(0, MAX_RECENT).forEach(clip => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a class="recent-item" href="${clip.url}" target="_blank" title="${clip.title}">
          <img class="recent-item-favicon" src="${getFavicon(clip.url)}" alt="" />
          <span class="recent-item-title">${clip.title || clip.url}</span>
          <span class="recent-item-dot"></span>
        </a>`;
      list.appendChild(li);
    });
  });
}

function saveRecentClip(url, title) {
  chrome.storage.local.get([KEY_CLIPS], ({ [KEY_CLIPS]: clips = [] }) => {
    const updated = [{ url, title, savedAt: Date.now() }]
      .concat(clips.filter(c => c.url !== url))
      .slice(0, MAX_RECENT);
    chrome.storage.local.set({ [KEY_CLIPS]: updated });
  });
}

// ── Current tab ───────────────────────────────────────────────────

let currentTab = null;

function loadCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    currentTab = tab;

    const titleEl = $('page-title');
    const urlEl   = $('page-url');
    const favicon = $('favicon');

    titleEl.textContent = tab.title || 'Untitled page';
    urlEl.textContent   = truncateUrl(tab.url || '');

    const faviconUrl = tab.favIconUrl || getFavicon(tab.url || '');
    if (faviconUrl) {
      favicon.src = faviconUrl;
      favicon.onerror = () => { favicon.style.display = 'none'; };
    } else {
      favicon.style.display = 'none';
    }

    // Disable clip button for non-http pages (chrome://, about:, etc.)
    if (!isValidUrl(tab.url || '')) {
      $('clip-btn').disabled = true;
      $('clip-btn').textContent = 'Cannot clip this page';
    }
  });
}

// ── Clip action ───────────────────────────────────────────────────

$('clip-btn').addEventListener('click', () => {
  if (!currentTab || !isValidUrl(currentTab.url)) return;

  chrome.storage.sync.get([KEY_APP_URL], ({ [KEY_APP_URL]: appUrl }) => {
    if (!appUrl) { showScreen('setup'); return; }

    const note  = $('note-input').value.trim();
    const url   = currentTab.url;
    const title = currentTab.title || '';

    const params = new URLSearchParams({ url, title });
    if (note) params.set('note', note);

    const shareUrl = `${appUrl}/share?${params.toString()}`;

    // Save to recent clips
    saveRecentClip(url, title);

    // Show brief success flash, then open share page
    showScreen('success');
    setTimeout(() => {
      chrome.tabs.create({ url: shareUrl });
      window.close();
    }, 600);
  });
});

// ── Setup flow ────────────────────────────────────────────────────

const setupInput = $('setup-url-input');
const setupSaveBtn = $('setup-save-btn');

setupInput.addEventListener('input', () => {
  setupSaveBtn.disabled = setupInput.value.trim().length < 4;
});

setupSaveBtn.addEventListener('click', () => {
  const appUrl = normalizeAppUrl(setupInput.value);
  if (!appUrl) return;
  chrome.storage.sync.set({ [KEY_APP_URL]: appUrl }, () => {
    showScreen('main');
    loadCurrentTab();
    loadRecentClips();
  });
});

setupInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !setupSaveBtn.disabled) setupSaveBtn.click();
});

// ── Settings flow ─────────────────────────────────────────────────

$('settings-btn').addEventListener('click', () => {
  chrome.storage.sync.get([KEY_APP_URL], ({ [KEY_APP_URL]: appUrl }) => {
    $('settings-url-input').value = appUrl || '';
    showScreen('settings');
  });
});

$('back-btn').addEventListener('click', () => {
  showScreen('main');
});

$('settings-save-btn').addEventListener('click', () => {
  const raw = $('settings-url-input').value.trim();
  if (!raw) return;
  const appUrl = normalizeAppUrl(raw);
  chrome.storage.sync.set({ [KEY_APP_URL]: appUrl }, () => {
    showScreen('main');
  });
});

$('settings-url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('settings-save-btn').click();
});

$('open-app-btn').addEventListener('click', () => {
  chrome.storage.sync.get([KEY_APP_URL], ({ [KEY_APP_URL]: appUrl }) => {
    if (appUrl) chrome.tabs.create({ url: appUrl });
    else showScreen('setup');
  });
});

// ── Init ──────────────────────────────────────────────────────────

chrome.storage.sync.get([KEY_APP_URL], ({ [KEY_APP_URL]: appUrl }) => {
  if (!appUrl) {
    showScreen('setup');
  } else {
    showScreen('main');
    loadCurrentTab();
    loadRecentClips();
  }
});
