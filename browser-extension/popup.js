'use strict';

const DEFAULT_APP_URL = 'http://localhost:3000';

const PLATFORM_CONFIG = {
  instagram:     { label: 'Instagram',     color: '#e1306c', bg: '#fce4ec' },
  youtube:       { label: 'YouTube',       color: '#ff0000', bg: '#ffebee' },
  xiaohongshu:   { label: 'Xiaohongshu',   color: '#ff2442', bg: '#fce4ec' },
  tiktok:        { label: 'TikTok',        color: '#010101', bg: '#f0f0f0' },
  pinterest:     { label: 'Pinterest',     color: '#e60023', bg: '#fce4ec' },
  tripadvisor:   { label: 'TripAdvisor',   color: '#34e0a1', bg: '#e0faf1' },
  googlemaps:    { label: 'Google Maps',   color: '#4285f4', bg: '#e3f2fd' },
  airbnb:        { label: 'Airbnb',        color: '#ff5a5f', bg: '#fce4ec' },
  booking:       { label: 'Booking.com',   color: '#003580', bg: '#e3f0fc' },
  viator:        { label: 'Viator',        color: '#328fa0', bg: '#e0f4f8' },
};

function detectPlatform(url) {
  if (url.includes('instagram.com'))                        return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('tiktok.com'))                           return 'tiktok';
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';
  if (url.includes('tripadvisor.com'))                      return 'tripadvisor';
  if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl')) return 'googlemaps';
  if (url.includes('airbnb.com'))                           return 'airbnb';
  if (url.includes('booking.com'))                          return 'booking';
  if (url.includes('viator.com'))                           return 'viator';
  return null;
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, data => {
      resolve((data.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''));
    });
  });
}

function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0] || null);
    });
  });
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function setLoading(loading) {
  const btn     = document.getElementById('saveBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');
  btn.disabled          = loading;
  btnText.style.display = loading ? 'none' : 'flex';
  spinner.style.display = loading ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab    = await getCurrentTab();
  const appUrl = await getAppUrl();

  // ── Footer links ───────────────────────────────────────────────────────
  document.getElementById('openApp').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl });
    window.close();
  });
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  if (!tab || !tab.url) {
    showError('Cannot access this page.');
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('pageTitle').textContent = 'No active tab found';
    return;
  }

  const url   = tab.url;
  const title = tab.title || url;

  // Block non-HTTP pages
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showError('Navigate to a webpage first — browser pages cannot be clipped.');
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('pageTitle').textContent = title;
    return;
  }

  // ── Favicon ────────────────────────────────────────────────────────────
  try {
    const hostname = new URL(url).hostname;
    const favicon  = document.getElementById('favicon');
    favicon.src    = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch (_) {}

  // ── Platform badge ─────────────────────────────────────────────────────
  const platformKey    = detectPlatform(url);
  const platformConfig = platformKey ? PLATFORM_CONFIG[platformKey] : null;
  if (platformConfig) {
    const badge = document.getElementById('platformBadge');
    badge.textContent         = platformConfig.label;
    badge.style.display       = 'inline-flex';
    badge.style.background    = platformConfig.bg;
    badge.style.color         = platformConfig.color;
  }

  // ── URL display ────────────────────────────────────────────────────────
  document.getElementById('pageTitle').textContent = title;
  try {
    document.getElementById('pageHost').textContent = new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    document.getElementById('pageHost').textContent = url;
  }

  // ── Save handler ───────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const note = document.getElementById('noteInput').value.trim();

    document.getElementById('errorMsg').style.display = 'none';
    setLoading(true);

    try {
      const shareUrl = new URL('/share', appUrl);
      shareUrl.searchParams.set('url', url);
      shareUrl.searchParams.set('title', title);
      if (note) shareUrl.searchParams.set('note', note);

      // Open the TravelPanel share page in a new tab
      chrome.tabs.create({ url: shareUrl.toString() });

      // Show success
      document.getElementById('mainContent').style.display = 'none';
      const successState = document.getElementById('successState');
      successState.style.display = 'flex';

      const subtitle = platformConfig
        ? `Sent ${platformConfig.label} link to TravelPanel for extraction.`
        : 'Sent to TravelPanel for location + substance extraction.';
      document.getElementById('successSubtitle').textContent = subtitle;

      // Auto-close after 1.4 s
      setTimeout(() => window.close(), 1400);
    } catch (err) {
      setLoading(false);
      showError(err && err.message ? err.message : 'Failed to open TravelPanel. Check Settings.');
    }
  });

  // Focus the note field for quick keyboard entry
  document.getElementById('noteInput').focus();
});
