// TravelPanel Clipper — popup.js

const STORAGE_KEY_URL = 'travelpanel_url';
const DEFAULT_URL = 'http://localhost:3000';

// ── Platform detection ──────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'youtube',      label: 'YouTube',      pattern: /youtube\.com|youtu\.be/ },
  { id: 'instagram',    label: 'Instagram',    pattern: /instagram\.com/ },
  { id: 'xiaohongshu',  label: '小红书',        pattern: /xiaohongshu\.com|xhslink\.com/ },
  { id: 'tiktok',       label: 'TikTok',       pattern: /tiktok\.com/ },
  { id: 'twitter',      label: 'X / Twitter',  pattern: /twitter\.com|x\.com/ },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

// ── Screen management ───────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Storage helpers ─────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get([STORAGE_KEY_URL], result => {
      resolve(result[STORAGE_KEY_URL] || '');
    });
  });
}

function setAppUrl(url) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [STORAGE_KEY_URL]: url }, resolve);
  });
}

// ── Open TravelPanel share page ─────────────────────────────────────────────

async function openSharePage(appUrl, tabUrl, tabTitle) {
  const shareUrl = new URL('/share', appUrl);
  shareUrl.searchParams.set('url', tabUrl);
  if (tabTitle) shareUrl.searchParams.set('title', tabTitle);
  const shareUrlStr = shareUrl.toString();

  // If a TravelPanel tab is already open, navigate it instead of opening a new one
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(t => t.url && t.url.startsWith(appUrl));

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { url: shareUrlStr, active: true });
    const win = await chrome.windows.get(existingTab.windowId);
    if (win) await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: shareUrlStr });
  }
}

// ── Error display ────────────────────────────────────────────────────────────

function showError(msg) {
  const banner = document.getElementById('error-banner');
  banner.textContent = msg;
  banner.classList.add('visible');
}

function hideError() {
  document.getElementById('error-banner').classList.remove('visible');
}

// ── Main init ────────────────────────────────────────────────────────────────

async function init() {
  const appUrl = await getAppUrl();

  if (!appUrl) {
    showScreen('screen-setup');
    setupFirstRun();
    return;
  }

  showScreen('screen-main');
  await loadCurrentTab(appUrl);
  wireMainButtons(appUrl);
}

async function loadCurrentTab(appUrl) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const title = tab.title || '';
  const url = tab.url || '';
  const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();

  document.getElementById('page-title').textContent = title || hostname;
  document.getElementById('page-url').textContent = hostname;

  // Favicon
  const faviconImg = document.getElementById('page-favicon');
  const faviconFallback = document.getElementById('favicon-fallback');
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  faviconImg.onload = () => { faviconImg.style.display = 'block'; faviconFallback.style.display = 'none'; };
  faviconImg.onerror = () => { faviconImg.style.display = 'none'; faviconFallback.style.display = 'block'; };
  faviconImg.src = faviconUrl;

  // Platform badge
  const platform = detectPlatform(url);
  const badge = document.getElementById('platform-badge');
  const label = document.getElementById('platform-label');
  if (platform) {
    badge.className = `platform-badge ${platform.id}`;
    label.textContent = platform.label;
  } else {
    label.textContent = hostname || 'Web page';
  }
}

function wireMainButtons(appUrl) {

  document.getElementById('btn-clip').addEventListener('click', async () => {
    hideError();
    const btn = document.getElementById('btn-clip');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Clipping…';

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.url) throw new Error('Could not read current tab URL.');
      await openSharePage(appUrl, activeTab.url, activeTab.title);

      // Show success briefly then close
      showScreen('screen-success');
      document.getElementById('success-sub').textContent =
        'Opening TravelPanel to add details…';
      setTimeout(() => window.close(), 1400);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/>
        </svg>
        Clip to TravelPanel`;
      showError(err.message || 'Something went wrong. Check your TravelPanel URL in Settings.');
    }
  });

  document.getElementById('btn-open-app').addEventListener('click', async () => {
    await chrome.tabs.create({ url: appUrl });
    window.close();
  });

  document.getElementById('btn-open-options').addEventListener('click', () => {
    document.getElementById('options-url').value = appUrl;
    showScreen('screen-options');
  });

  document.getElementById('btn-back-from-options').addEventListener('click', () => {
    showScreen('screen-main');
  });

  document.getElementById('btn-save-options').addEventListener('click', async () => {
    const input = document.getElementById('options-url');
    const newUrl = input.value.trim().replace(/\/$/, '');
    if (!newUrl) return;
    await setAppUrl(newUrl);
    // Re-init with new URL
    init();
  });
}

function setupFirstRun() {
  document.getElementById('btn-save-setup').addEventListener('click', async () => {
    const input = document.getElementById('setup-url');
    const url = input.value.trim().replace(/\/$/, '');
    if (!url) {
      input.focus();
      return;
    }
    await setAppUrl(url);
    init();
  });

  // Also allow pressing Enter in the input
  document.getElementById('setup-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-setup').click();
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
