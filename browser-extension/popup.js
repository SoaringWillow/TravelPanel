'use strict';

const DEFAULT_URL = 'http://localhost:3000';

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ travelPanelUrl: DEFAULT_URL }, resolve);
  });
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab));
  });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(tabUrl) {
  try {
    const origin = new URL(tabUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function showError(msg) {
  const err = document.getElementById('error-state');
  document.getElementById('error-msg').textContent = msg;
  err.classList.remove('hidden');
  setTimeout(() => err.classList.add('hidden'), 3000);
}

function showSuccess() {
  document.getElementById('actions').classList.add('hidden');
  document.getElementById('success-state').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab();

  // Populate page info
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  const domainEl = document.getElementById('page-domain');
  const faviconEl = document.getElementById('page-favicon');

  titleEl.textContent = tab.title || 'Untitled page';
  urlEl.textContent = tab.url || '';
  domainEl.textContent = getDomain(tab.url || '');

  const faviconUrl = getFaviconUrl(tab.url || '');
  if (faviconUrl) {
    faviconEl.src = faviconUrl;
    faviconEl.onerror = () => faviconEl.classList.add('hidden');
  } else {
    faviconEl.classList.add('hidden');
  }

  // Clip button
  document.getElementById('clip-btn').addEventListener('click', async () => {
    const btn = document.getElementById('clip-btn');
    btn.disabled = true;

    try {
      const { travelPanelUrl } = await getSettings();
      const base = travelPanelUrl.replace(/\/$/, '');
      const shareUrl =
        `${base}/share` +
        `?url=${encodeURIComponent(tab.url || '')}` +
        `&title=${encodeURIComponent(tab.title || '')}`;

      chrome.tabs.create({ url: shareUrl });
      showSuccess();

      setTimeout(() => window.close(), 1200);
    } catch (e) {
      btn.disabled = false;
      showError('Could not open TravelPanel. Check your settings.');
    }
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
