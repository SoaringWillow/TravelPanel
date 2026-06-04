// TravelPanel Clipper — background service worker
// Handles: dynamic icon drawing, context menu setup

// ── Icon drawing ──────────────────────────────────────────────────────────────

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;
  const cx = s / 2;

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fillStyle = '#6366f1';
  ctx.fill();

  // Map pin body
  const pinScale = s / 48;
  ctx.beginPath();
  ctx.arc(cx, cx - 3 * pinScale, 7 * pinScale, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Pin point
  ctx.beginPath();
  ctx.moveTo(cx - 5 * pinScale, cx);
  ctx.lineTo(cx + 5 * pinScale, cx);
  ctx.lineTo(cx, cx + 10 * pinScale);
  ctx.closePath();
  ctx.fillStyle = 'white';
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(cx, cx - 3 * pinScale, 3 * pinScale, 0, Math.PI * 2);
  ctx.fillStyle = '#6366f1';
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

// ── Install handler ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Set canvas-drawn icon
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
    // Fallback: leave browser default icon
  }

  // Context menu: right-click any page or link
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip link to TravelPanel',
    contexts: ['link'],
  });
});

// ── Context menu click ────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { panelUrl = '' } = await chrome.storage.sync.get('panelUrl');
  if (!panelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  if (!targetUrl) return;

  const shareUrl = buildShareUrl(panelUrl, targetUrl, title);
  chrome.tabs.create({ url: shareUrl });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildShareUrl(panelUrl, url, title) {
  const base = panelUrl.replace(/\/$/, '');
  return `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
