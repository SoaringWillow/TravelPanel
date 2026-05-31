'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Load current tab and saved settings in parallel
  const [tabs, { travelpanelUrl }] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.sync.get(['travelpanelUrl']),
  ]);

  const tab = tabs[0];
  const appUrl = (travelpanelUrl || '').replace(/\/$/, '');

  // Populate page info
  populatePageInfo(tab);

  // Show correct state based on whether URL is configured
  if (!appUrl) {
    showSetupRequired();
  } else {
    showClipAction();
  }

  // Wire up buttons
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });

  document.getElementById('setup-btn').addEventListener('click', openSettings);

  document.getElementById('clip-btn').addEventListener('click', async () => {
    await clipPage(tab, appUrl);
  });
});

function populatePageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const domainEl = document.getElementById('page-domain');
  const faviconEl = document.getElementById('favicon');
  const faviconFallbackEl = document.getElementById('favicon-fallback');

  titleEl.textContent = tab.title || 'Untitled page';

  try {
    const url = new URL(tab.url);
    domainEl.textContent = url.hostname.replace(/^www\./, '');

    // Use Google's favicon service for reliable cross-site icons
    faviconEl.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    faviconEl.onerror = () => {
      faviconEl.classList.add('hidden');
      faviconFallbackEl.classList.remove('hidden');
    };
  } catch {
    domainEl.textContent = '';
    faviconEl.classList.add('hidden');
    faviconFallbackEl.classList.remove('hidden');
  }
}

function showSetupRequired() {
  document.getElementById('page-info').classList.remove('hidden');
  document.getElementById('action-wrap').classList.add('hidden');
  document.getElementById('setup-wrap').classList.remove('hidden');
  document.getElementById('success-wrap').classList.add('hidden');
}

function showClipAction() {
  document.getElementById('page-info').classList.remove('hidden');
  document.getElementById('action-wrap').classList.remove('hidden');
  document.getElementById('setup-wrap').classList.add('hidden');
  document.getElementById('success-wrap').classList.add('hidden');
}

function showSuccess() {
  document.getElementById('page-info').classList.add('hidden');
  document.getElementById('action-wrap').classList.add('hidden');
  document.getElementById('setup-wrap').classList.add('hidden');
  document.getElementById('success-wrap').classList.remove('hidden');
  document.getElementById('footer').classList.add('hidden');
}

async function clipPage(tab, appUrl) {
  const btn = document.getElementById('clip-btn');
  btn.disabled = true;

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(tab.url)}` +
    `&title=${encodeURIComponent(tab.title || '')}`;

  await chrome.tabs.create({ url: shareUrl });

  showSuccess();
  setTimeout(() => window.close(), 1400);
}

function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}
