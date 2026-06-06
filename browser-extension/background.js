'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// ── Icon ─────────────────────────────────────────────
// Draw a map-pin icon using OffscreenCanvas (no PNG files needed)

function drawPinIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 128;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 6 * s;
  ctx.shadowOffsetY = 2 * s;

  // Pin body (teardrop)
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(64 * s, 52 * s, 38 * s, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail
  ctx.beginPath();
  ctx.moveTo(38 * s, 78 * s);
  ctx.quadraticCurveTo(64 * s, 118 * s, 90 * s, 78 * s);
  ctx.fill();

  // Reset shadow for inner ring
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // White inner circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64 * s, 52 * s, 20 * s, 0, Math.PI * 2);
  ctx.fill();

  // Blue dot centre
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(64 * s, 52 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

async function applyIcon() {
  try {
    await chrome.action.setIcon({
      imageData: {
        16:  drawPinIcon(16),
        32:  drawPinIcon(32),
        48:  drawPinIcon(48),
        128: drawPinIcon(128),
      },
    });
  } catch {
    // Silently ignore; some environments block dynamic icon setting
  }
}

// ── Context menu ──────────────────────────────────────

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Save page to TravelPanel',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'clip-link',
      title: 'Save link to TravelPanel',
      contexts: ['link'],
    });
  });
}

// ── Lifecycle ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  applyIcon();
  createContextMenus();
});

// Re-apply icon after browser restarts (imageData doesn't persist)
chrome.runtime.onStartup.addListener(applyIcon);

// ── Context menu handler ──────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  const pageUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title   = tab?.title || '';

  if (!pageUrl) return;

  const base   = appUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl, title });
  const shareUrl = `${base}/share?${params.toString()}`;

  const w = 420, h = 640;
  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: w,
    height: h,
    left: Math.round((1440 - w) / 2), // reasonable default; user can move it
    top:  Math.round((900  - h) / 2),
  });
});
