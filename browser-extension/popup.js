'use strict';

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram',    label: 'Instagram',    icon: '📸', pattern: /instagram\.com/i,                  css: 'platform-instagram' },
  { id: 'youtube',      label: 'YouTube',      icon: '▶️', pattern: /youtube\.com|youtu\.be/i,           css: 'platform-youtube' },
  { id: 'tiktok',       label: 'TikTok',       icon: '🎵', pattern: /tiktok\.com/i,                     css: 'platform-tiktok' },
  { id: 'twitter',      label: 'X / Twitter',  icon: '𝕏',  pattern: /twitter\.com|x\.com/i,             css: 'platform-twitter' },
  { id: 'xiaohongshu',  label: '小红书',        icon: '📕', pattern: /xiaohongshu\.com|xhslink\.com/i,   css: 'platform-xiaohongshu' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { id: 'web', label: 'Web', icon: '🌐', css: 'platform-web' };
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getStoredUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelpanelUrl'], (result) => {
      resolve(result.travelpanelUrl || '');
    });
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showStatus(type, html) {
  const el = document.getElementById('statusMsg');
  el.className = `status show ${type}`;
  el.innerHTML = html;
}

function hideStatus() {
  const el = document.getElementById('statusMsg');
  el.className = 'status';
  el.innerHTML = '';
}

// ── Initialise popup ──────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const storedUrl = await getStoredUrl();

  // Warn if not configured
  const notConfiguredEl = document.getElementById('notConfigured');
  if (!storedUrl) {
    notConfiguredEl.classList.add('show');
  }

  // Handle chrome://, about:, extension:// pages
  const url = tab?.url || '';
  const isClippable = url && url.startsWith('http');

  if (!isClippable) {
    document.getElementById('pageInfo').style.display = 'none';
    document.getElementById('noUrlState').classList.add('show');
    document.getElementById('clipBtn').disabled = true;
    return;
  }

  // Populate page info
  const title = tab.title || url;
  const platform = detectPlatform(url);

  const badgeEl = document.getElementById('platformBadge');
  badgeEl.className = `platform-badge ${platform.css}`;
  document.getElementById('platformIcon').textContent = platform.icon + ' ';
  document.getElementById('platformLabel').textContent = platform.label;

  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = url;

  // Wire up Clip button
  document.getElementById('clipBtn').addEventListener('click', async () => {
    const base = await getStoredUrl();
    if (!base) {
      document.getElementById('notConfigured').classList.add('show');
      showStatus('error',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '&nbsp;Set your TravelPanel URL in settings first.'
      );
      return;
    }

    const shareUrl = base.replace(/\/$/, '') +
      '/share?url=' + encodeURIComponent(url) +
      '&title=' + encodeURIComponent(title);

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // Wire up Open App button
  document.getElementById('openAppBtn').addEventListener('click', async () => {
    const base = await getStoredUrl();
    if (!base) {
      showStatus('error',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '&nbsp;TravelPanel URL not set. <a href="#" id="settingsLink" style="color:#4f46e5">Open settings</a>'
      );
      setTimeout(() => {
        const link = document.getElementById('settingsLink');
        if (link) link.addEventListener('click', openSettings);
      }, 0);
      return;
    }
    chrome.tabs.create({ url: base });
    window.close();
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Settings button
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('configureLink').addEventListener('click', (e) => {
  e.preventDefault();
  openSettings();
});

init().catch((err) => {
  showStatus('error', '⚠️ ' + err.message);
});
