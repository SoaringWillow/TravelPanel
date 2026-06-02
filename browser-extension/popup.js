'use strict';

const DEFAULT_APP_URL = '';

const PLATFORMS = {
  instagram:    { label: 'Instagram',    color: '#E1306C', hosts: ['instagram.com'] },
  youtube:      { label: 'YouTube',      color: '#FF0000', hosts: ['youtube.com', 'youtu.be'] },
  xiaohongshu:  { label: 'Xiaohongshu', color: '#FF2442', hosts: ['xiaohongshu.com', 'xhslink.com'] },
  tiktok:       { label: 'TikTok',       color: '#010101', hosts: ['tiktok.com'] },
  twitter:      { label: 'X / Twitter',  color: '#1DA1F2', hosts: ['twitter.com', 'x.com'] },
  tripadvisor:  { label: 'TripAdvisor',  color: '#00AA6C', hosts: ['tripadvisor.com'] },
  maps:         { label: 'Google Maps',  color: '#4285F4', hosts: ['maps.google.com', 'goo.gl/maps'] },
};

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url);
    for (const [key, p] of Object.entries(PLATFORMS)) {
      if (p.hosts.some(h => hostname.includes(h))) return { key, ...p };
    }
  } catch {}
  return { key: 'other', label: 'Web', color: '#6b7280' };
}

function getAppUrl() {
  return new Promise(resolve =>
    chrome.storage.sync.get(['appUrl'], r => resolve((r.appUrl || '').trim()))
  );
}

function show(id) {
  ['loadingState', 'mainState', 'savedState', 'noAppState'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl    = document.getElementById('pageTitle');
  const urlEl      = document.getElementById('pageUrl');
  const chipEl     = document.getElementById('platformChip');
  const saveBtn    = document.getElementById('saveBtn');

  document.getElementById('settingsBtn').addEventListener('click', () =>
    chrome.runtime.openOptionsPage()
  );
  document.getElementById('configureBtn').addEventListener('click', () =>
    chrome.runtime.openOptionsPage()
  );

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url   || '';
  const title = tab?.title || 'Untitled';
  const appUrl = await getAppUrl();

  if (!appUrl) {
    show('noAppState');
    return;
  }

  const platform = detectPlatform(url);
  chipEl.textContent = platform.label;
  chipEl.style.backgroundColor = platform.color;
  titleEl.textContent = title;
  urlEl.textContent   = url;

  show('mainState');

  saveBtn.addEventListener('click', () => {
    if (!url) return;
    saveBtn.disabled = true;
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    show('savedState');
    setTimeout(() => window.close(), 1400);
  });
});
