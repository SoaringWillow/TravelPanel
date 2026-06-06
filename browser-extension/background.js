// ─── Programmatic icon (no PNG files needed) ─────────────────────────────────

function drawPin(size) {
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext('2d');
  const s = size;

  // Indigo circle background
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();

  // White location-pin shape
  ctx.fillStyle = '#ffffff';
  const cx = s * 0.5;
  const headY = s * 0.34;
  const r = s * 0.2;

  // Round head
  ctx.beginPath();
  ctx.arc(cx, headY, r, 0, Math.PI * 2);
  ctx.fill();

  // Teardrop body
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.75, headY + r * 0.6);
  ctx.lineTo(cx + r * 0.75, headY + r * 0.6);
  ctx.lineTo(cx, s * 0.8);
  ctx.closePath();
  ctx.fill();

  // Inner dot (hole in pin head) — indigo
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, headY, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

function applyIcon() {
  const imageData = {};
  for (const size of [16, 24, 32, 48, 128]) {
    imageData[size] = drawPin(size);
  }
  chrome.action.setIcon({ imageData });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  applyIcon();

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

chrome.runtime.onStartup.addListener(applyIcon);

// ─── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl ?? tab?.url ?? '';
  const title = info.menuItemId === 'clip-link' ? '' : (tab?.title ?? '');
  if (!url) return;

  const { travelPanelUrl } = await chrome.storage.sync.get('travelPanelUrl');
  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  chrome.tabs.create({ url: buildShareUrl(travelPanelUrl, url, title) });
});

// ─── Shared util ─────────────────────────────────────────────────────────────

function buildShareUrl(base, pageUrl, title) {
  const cleanBase = base.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl, ...(title ? { title } : {}) });
  return `${cleanBase}/share?${params}`;
}
