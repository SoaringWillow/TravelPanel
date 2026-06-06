'use strict';

const PLATFORM_MAP = {
  instagram: { name: 'Instagram', color: '#c13584', bg: '#fce4f0', emoji: '📸' },
  youtube:   { name: 'YouTube',   color: '#cc0000', bg: '#ffebee', emoji: '📺' },
  xiaohongshu: { name: '小红书',  color: '#ff2442', bg: '#fff0f0', emoji: '📕' },
  douyin:    { name: 'TikTok',    color: '#010101', bg: '#f5f5f5', emoji: '🎵' },
  bilibili:  { name: 'Bilibili',  color: '#00a1d6', bg: '#e3f2fd', emoji: '🎮' },
  other:     { name: 'Web',       color: '#6366f1', bg: '#ede9fe', emoji: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url)) return 'xiaohongshu';
  if (/douyin\.com|tiktok\.com/.test(url)) return 'douyin';
  if (/bilibili\.com/.test(url)) return 'bilibili';
  return 'other';
}

function trunc(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max) + '…';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

async function getConfig() {
  return new Promise(res => chrome.storage.sync.get({ travelPanelUrl: '' }, res));
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function renderSetup(main) {
  main.innerHTML = `
    <div class="setup-card">
      <div class="setup-icon">🗺️</div>
      <div class="setup-title">Connect TravelPanel</div>
      <div class="setup-sub">
        Enter your TravelPanel URL to start clipping travel posts to your boards.
      </div>
      <button class="setup-btn" id="setupBtn">Configure URL →</button>
    </div>
  `;
  document.getElementById('setupBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function renderPage(main, tab, config) {
  const platform = detectPlatform(tab.url);
  const info = PLATFORM_MAP[platform];
  const host = (tab.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  const displayUrl = trunc(host + (tab.url || '').replace(/^https?:\/\/[^/]+/, ''), 44);

  const faviconHtml = tab.favIconUrl
    ? `<img src="${esc(tab.favIconUrl)}" alt="" onerror="this.parentNode.textContent='🌐'">`
    : '🌐';

  main.innerHTML = `
    <div class="page-card">
      <div class="favicon-wrap">${faviconHtml}</div>
      <div class="page-info">
        <div class="page-title">${esc(trunc(tab.title || 'Untitled page', 52))}</div>
        <div class="page-url">${esc(displayUrl)}</div>
        <span class="platform-badge"
          style="background:${info.bg};color:${info.color}">
          ${info.emoji} ${info.name}
        </span>
      </div>
    </div>
    <button class="clip-btn" id="clipBtn">
      <span>📌</span><span>Clip to TravelPanel</span>
    </button>
  `;

  document.getElementById('clipBtn').addEventListener('click', () => {
    doClip(main, tab, config);
  });
}

function doClip(main, tab, config) {
  const btn = document.getElementById('clipBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>Opening…</span>'; }

  const base = config.travelPanelUrl.replace(/\/+$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;

  chrome.tabs.create({ url: shareUrl }, () => {
    renderSuccess(main, tab);
    setTimeout(() => window.close(), 1600);
  });
}

function renderSuccess(main, tab) {
  main.innerHTML = `
    <div class="success-card">
      <div class="success-icon">✅</div>
      <div class="success-title">Opened in TravelPanel</div>
      <div class="success-sub">${esc(trunc(tab.title || tab.url, 42))}</div>
    </div>
  `;
}

async function init() {
  const main = document.getElementById('main');
  const settingsBtn = document.getElementById('settingsBtn');

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  try {
    const [config, tab] = await Promise.all([getConfig(), getCurrentTab()]);

    if (!config.travelPanelUrl) {
      renderSetup(main);
      return;
    }

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      main.innerHTML = `
        <div class="error-msg">
          Can't clip this page. Navigate to a travel site first.
        </div>
      `;
      return;
    }

    renderPage(main, tab, config);
  } catch (err) {
    main.innerHTML = `<div class="error-msg">Error: ${esc(err.message)}</div>`;
  }
}

init();
