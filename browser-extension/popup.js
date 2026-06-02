'use strict';

// ── Storage helpers ──────────────────────────────────────────────────────────

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => resolve(result.appUrl || ''));
  });
}

function saveAppUrl(url) {
  return new Promise(resolve => chrome.storage.sync.set({ appUrl: url }, resolve));
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function show(id) {
  ['mainContent', 'successContent', 'errorContent', 'setupContent'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function $(id) { return document.getElementById(id); }

// ── URL utilities ────────────────────────────────────────────────────────────

function isClippable(url) {
  if (!url) return false;
  return !url.startsWith('chrome://') &&
         !url.startsWith('chrome-extension://') &&
         !url.startsWith('about:') &&
         !url.startsWith('moz-extension://') &&
         !url.startsWith('edge://') &&
         !url.startsWith('data:');
}

function formatDisplayUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname !== '/' ? u.pathname : '';
    const full = host + path;
    return full.length > 42 ? full.slice(0, 42) + '…' : full;
  } catch {
    return url.slice(0, 42);
  }
}

// ── Initialise popup ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const appUrl = await getAppUrl();

  // ── First-run setup ───────────────────────────────────────────────────────
  if (!appUrl) {
    show('setupContent');

    $('saveSetupBtn').addEventListener('click', async () => {
      const raw = $('setupUrl').value.trim().replace(/\/$/, '');
      $('setupError').classList.add('hidden');

      if (!raw) {
        $('setupError').textContent = 'Please enter your TravelPanel URL.';
        $('setupError').classList.remove('hidden');
        return;
      }

      try { new URL(raw); } catch {
        $('setupError').textContent = 'That doesn\'t look like a valid URL.';
        $('setupError').classList.remove('hidden');
        return;
      }

      await saveAppUrl(raw);
      location.reload();
    });

    $('setupUrl').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('saveSetupBtn').click();
    });

    return;
  }

  // ── Load current tab ───────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !isClippable(tab.url)) {
    show('errorContent');
    $('errorMessage').textContent = tab?.url?.startsWith('chrome://')
      ? 'Chrome system pages can\'t be clipped. Try a regular webpage.'
      : 'This page type can\'t be clipped.';

    $('retryBtn').addEventListener('click', () => window.close());
    return;
  }

  // ── Populate URL preview ───────────────────────────────────────────────────
  show('mainContent');

  const title = tab.title || new URL(tab.url).hostname;
  $('pageTitle').textContent = title;
  $('pageUrl').textContent = formatDisplayUrl(tab.url);

  // Use browser-provided favicon (no external requests needed)
  if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
    const img = document.createElement('img');
    img.src = tab.favIconUrl;
    img.alt = '';
    img.onerror = () => img.remove();
    $('favicon').innerHTML = '';
    $('favicon').appendChild(img);
  }

  // ── Clip button ────────────────────────────────────────────────────────────
  $('clipBtn').addEventListener('click', () => {
    const btn = $('clipBtn');
    btn.disabled = true;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.6-5.49"/></svg> Saving…';

    const shareUrl = `${appUrl}/share` +
      `?url=${encodeURIComponent(tab.url)}` +
      `&title=${encodeURIComponent(title)}`;

    chrome.tabs.create({ url: shareUrl });
    show('successContent');
    setTimeout(() => window.close(), 1800);
  });

  // ── Settings button ────────────────────────────────────────────────────────
  $('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // ── Retry from error state ─────────────────────────────────────────────────
  $('retryBtn')?.addEventListener('click', () => show('mainContent'));
});
