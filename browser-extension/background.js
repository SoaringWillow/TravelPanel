// TravelPanel Clipper — Service Worker
// Handles: dynamic toolbar icon, context menus, popup window management

const DEFAULT_URL = 'http://localhost:3000';

// ─── Dynamic icon via OffscreenCanvas ────────────────────────────────────────

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background: indigo gradient approximated as solid
  ctx.fillStyle = '#4F46E5';
  roundRect(ctx, 0, 0, size, size, size * 0.2);
  ctx.fill();

  // Plane symbol (✈) via path
  const s = size / 16;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.58)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', size / 2, size / 2 + s * 0.5);

  return ctx.getImageData(0, 0, size, size);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function setDynamicIcon() {
  try {
    chrome.action.setIcon({
      imageData: {
        16: drawIcon(16),
        32: drawIcon(32),
        48: drawIcon(48),
        128: drawIcon(128),
      },
    });
  } catch {
    // OffscreenCanvas may not be available in all contexts; silently skip
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setDynamicIcon();

  chrome.contextMenus.create({
    id: 'clip-page',
    title: '✈️ Clip this page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-link',
    title: '✈️ Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.runtime.onStartup.addListener(() => {
  setDynamicIcon();
});

// ─── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelpanelUrl } = await chrome.storage.sync.get({ travelpanelUrl: DEFAULT_URL });
  const base = travelpanelUrl.replace(/\/$/, '');

  let clipUrl, clipTitle;

  if (info.menuItemId === 'clip-link' && info.linkUrl) {
    clipUrl = info.linkUrl;
    clipTitle = info.selectionText || info.linkUrl;
  } else {
    clipUrl = tab?.url || '';
    clipTitle = tab?.title || '';
  }

  if (!clipUrl) return;

  const shareUrl = `${base}/share?url=${encodeURIComponent(clipUrl)}&title=${encodeURIComponent(clipTitle)}`;
  openShareWindow(shareUrl);
});

// ─── Message handler (from popup) ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'open-share') {
    openShareWindow(msg.url);
    sendResponse({ ok: true });
  }
  return true;
});

// ─── Share window helper ──────────────────────────────────────────────────────

function openShareWindow(shareUrl) {
  const width = 400;
  const height = 580;

  // Try to center on screen
  const left = Math.round((screen.width - width) / 2);
  const top = Math.round((screen.height - height) / 2);

  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width,
    height,
    left,
    top,
  });
}
