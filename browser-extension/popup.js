'use strict';

// ─── Platform detection (mirrors lib/parse-url.ts) ──────────────────────────

const PLATFORM_META = {
  instagram:     { label: 'Instagram',      color: '#e1306c' },
  youtube:       { label: 'YouTube',        color: '#ff0000' },
  xiaohongshu:   { label: '小红书',          color: '#fe2c55' },
  tiktok:        { label: 'TikTok',         color: '#010101' },
  twitter:       { label: 'X / Twitter',    color: '#000000' },
  pinterest:     { label: 'Pinterest',      color: '#e60023' },
  tripadvisor:   { label: 'TripAdvisor',    color: '#34e0a1' },
  google_maps:   { label: 'Google Maps',    color: '#4285f4' },
  airbnb:        { label: 'Airbnb',         color: '#ff5a5f' },
  booking:       { label: 'Booking.com',    color: '#003580' },
  other:         { label: 'Web',            color: '#6366f1' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  const h = url.toLowerCase();
  if (h.includes('instagram.com'))     return 'instagram';
  if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
  if (h.includes('xiaohongshu.com') || h.includes('xhslink.com') || h.includes('redbook')) return 'xiaohongshu';
  if (h.includes('tiktok.com'))        return 'tiktok';
  if (h.includes('twitter.com') || h.includes('x.com')) return 'twitter';
  if (h.includes('pinterest.com'))     return 'pinterest';
  if (h.includes('tripadvisor.'))      return 'tripadvisor';
  if (h.includes('maps.google.') || h.includes('goo.gl/maps')) return 'google_maps';
  if (h.includes('airbnb.'))           return 'airbnb';
  if (h.includes('booking.com'))       return 'booking';
  return 'other';
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function showState(id) {
  ['state-ready', 'state-loading', 'state-done'].forEach(s => {
    document.getElementById(s).style.display = s === id ? 'block' : 'none';
  });
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  showState('state-ready');

  // Get TravelPanel base URL from storage (set in options.html)
  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');
  const baseUrl = (travelPanelUrl || '').replace(/\/$/, '');

  // ── Get current tab info ─────────────────────────────────────────────────

  let tabUrl   = '';
  let tabTitle = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl   = tab?.url   ?? '';
    tabTitle = tab?.title ?? '';
  } catch {
    showError('Could not read the current page. Please try again.');
    return;
  }

  // Chrome blocks extension access on chrome:// and store pages
  if (!tabUrl || tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
    showError('Cannot clip this page. Navigate to a travel website first.');
    return;
  }

  // ── Update UI ────────────────────────────────────────────────────────────

  const platform   = detectPlatform(tabUrl);
  const meta       = PLATFORM_META[platform] ?? PLATFORM_META.other;

  const chipEl  = document.getElementById('platform-chip');
  chipEl.textContent       = meta.label;
  chipEl.style.background  = meta.color;

  document.getElementById('page-title').textContent = tabTitle || tabUrl;
  document.getElementById('page-url').textContent   = tabUrl;

  // ── Config guard ─────────────────────────────────────────────────────────

  if (!baseUrl) {
    showError('TravelPanel URL not configured. Click Settings below to add it.');
    document.getElementById('clip-btn').disabled = true;
  }

  // ── Clip button ──────────────────────────────────────────────────────────

  document.getElementById('clip-btn').addEventListener('click', async () => {
    if (!baseUrl) {
      showError('Set your TravelPanel URL in Settings first.');
      return;
    }

    const shareUrl = `${baseUrl}/share?url=${encodeURIComponent(tabUrl)}&title=${encodeURIComponent(tabTitle)}`;

    // Open share page in a new tab
    await chrome.tabs.create({ url: shareUrl });

    // Show done state with link back to app root
    document.getElementById('done-message').textContent =
      `"${tabTitle.slice(0, 60)}${tabTitle.length > 60 ? '…' : ''}" sent to TravelPanel.`;
    document.getElementById('view-link').href = baseUrl;
    showState('state-done');
  });

  // ── Settings link ────────────────────────────────────────────────────────

  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
