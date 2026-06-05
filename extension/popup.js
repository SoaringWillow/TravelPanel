'use strict';

const STORAGE_KEY = 'travelPanelUrl';

// Platform detection mirrors app/api/import/route.ts logic
const PLATFORM_LABELS = {
  xiaohongshu: '小红书',
  wechat: 'WeChat',
  douyin: '抖音',
  bilibili: 'Bilibili',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: null,
};

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('xiaohongshu.com') || hostname.includes('xhscdn.com')) return 'xiaohongshu';
    if (hostname.includes('weixin.qq.com') || hostname.includes('mp.weixin.qq.com')) return 'wechat';
    if (hostname.includes('douyin.com') || hostname.includes('dy.com')) return 'douyin';
    if (hostname.includes('bilibili.com') || hostname.includes('b23.tv')) return 'bilibili';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  } catch {
    // ignore malformed URLs
  }
  return 'other';
}

function truncateUrl(url, maxLength = 45) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > maxLength ? short.slice(0, maxLength) + '…' : short;
  } catch {
    return url.length > maxLength ? url.slice(0, maxLength) + '…' : url;
  }
}

// View management
const views = ['setup', 'settings', 'clip', 'clipping', 'error'];
function showView(name) {
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) el.classList.toggle('hidden', v !== name);
  });
}

// DOM references (set after DOMContentLoaded)
let state = {
  travelPanelUrl: null,
  currentTab: null,
};

async function loadStoredUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

async function saveUrl(url) {
  // Normalize: strip trailing slash
  const normalized = url.replace(/\/$/, '');
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, resolve);
  });
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function buildClipUrl(tpBase, tabUrl, tabTitle) {
  const params = new URLSearchParams({ url: tabUrl });
  if (tabTitle) params.set('title', tabTitle);
  return `${tpBase}/share?${params.toString()}`;
}

function renderClipView(tab) {
  const faviconEl = document.getElementById('favicon');
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const badgeWrap = document.getElementById('platform-badge-wrap');
  const badgeEl = document.getElementById('platform-badge');

  const tabUrl = tab.url || '';
  const tabTitle = tab.title || '';

  // Favicon
  if (tab.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
  } else {
    faviconEl.style.display = 'none';
  }

  titleEl.textContent = tabTitle || truncateUrl(tabUrl);
  urlEl.textContent = truncateUrl(tabUrl);

  // Platform badge
  const platform = detectPlatform(tabUrl);
  const label = PLATFORM_LABELS[platform];
  if (label) {
    badgeEl.textContent = label;
    badgeWrap.classList.remove('hidden');
  } else {
    badgeWrap.classList.add('hidden');
  }

  showView('clip');
}

function showError(message) {
  const msgEl = document.getElementById('error-message');
  if (msgEl) msgEl.textContent = message;
  showView('error');
}

async function doClip() {
  if (!state.travelPanelUrl || !state.currentTab) return;

  showView('clipping');

  const clipUrl = buildClipUrl(
    state.travelPanelUrl,
    state.currentTab.url,
    state.currentTab.title
  );

  try {
    // Open TravelPanel share page in a new tab
    await chrome.tabs.create({ url: clipUrl, active: true });
    // Close popup after short delay so user sees the transition
    setTimeout(() => window.close(), 300);
  } catch (err) {
    showError('Could not open TravelPanel. Check your URL in Settings.');
  }
}

async function init() {
  state.travelPanelUrl = await loadStoredUrl();
  state.currentTab = await getCurrentTab();

  if (!state.travelPanelUrl) {
    showView('setup');
    return;
  }

  if (!state.currentTab || !state.currentTab.url || state.currentTab.url.startsWith('chrome://')) {
    showError('Cannot clip this page (browser internal page).');
    return;
  }

  renderClipView(state.currentTab);
}

document.addEventListener('DOMContentLoaded', () => {
  // Setup view
  const saveConfigBtn = document.getElementById('save-config-btn');
  const tpUrlInput = document.getElementById('tp-url');

  saveConfigBtn?.addEventListener('click', async () => {
    const val = tpUrlInput?.value?.trim();
    if (!val || !val.startsWith('http')) {
      tpUrlInput?.focus();
      tpUrlInput?.reportValidity?.();
      return;
    }
    await saveUrl(val);
    state.travelPanelUrl = val.replace(/\/$/, '');
    if (state.currentTab && state.currentTab.url && !state.currentTab.url.startsWith('chrome://')) {
      renderClipView(state.currentTab);
    } else {
      showError('Setup complete! Navigate to a travel page and click the extension icon.');
    }
  });

  tpUrlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveConfigBtn?.click();
  });

  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn?.addEventListener('click', () => {
    const urlEditInput = document.getElementById('tp-url-edit');
    if (urlEditInput && state.travelPanelUrl) {
      urlEditInput.value = state.travelPanelUrl;
    }
    showView('settings');
  });

  // Settings: cancel
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  cancelSettingsBtn?.addEventListener('click', () => {
    if (state.travelPanelUrl && state.currentTab) {
      renderClipView(state.currentTab);
    } else if (!state.travelPanelUrl) {
      showView('setup');
    }
  });

  // Settings: save
  const updateConfigBtn = document.getElementById('update-config-btn');
  const tpUrlEditInput = document.getElementById('tp-url-edit');
  updateConfigBtn?.addEventListener('click', async () => {
    const val = tpUrlEditInput?.value?.trim();
    if (!val || !val.startsWith('http')) {
      tpUrlEditInput?.focus();
      return;
    }
    await saveUrl(val);
    state.travelPanelUrl = val.replace(/\/$/, '');
    if (state.currentTab && state.currentTab.url) {
      renderClipView(state.currentTab);
    }
  });

  tpUrlEditInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') updateConfigBtn?.click();
  });

  // Clip button
  const clipBtn = document.getElementById('clip-btn');
  clipBtn?.addEventListener('click', doClip);

  // Error retry
  const retryBtn = document.getElementById('error-retry-btn');
  retryBtn?.addEventListener('click', () => {
    if (!state.travelPanelUrl) {
      showView('setup');
    } else {
      init();
    }
  });

  // Initialize
  init();
});
