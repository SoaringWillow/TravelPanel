// ── Icon drawing via OffscreenCanvas ──────────────────────────────────────

function drawIconImageData(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.2; // corner radius

  // Rounded rectangle background
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // Bookmark / clip shape in white
  const l = size * 0.28;
  const w = size * 0.44;
  const t = size * 0.18;
  const b = size * 0.82;
  const notchDepth = size * 0.14;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(l, t);
  ctx.lineTo(l + w, t);
  ctx.lineTo(l + w, b);
  ctx.lineTo(l + w / 2, b - notchDepth);
  ctx.lineTo(l, b);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setIcon() {
  try {
    const imageData = {
      16: drawIconImageData(16),
      32: drawIconImageData(32),
      48: drawIconImageData(48),
    };
    chrome.action.setIcon({ imageData });
  } catch {
    // OffscreenCanvas not available in older browsers — fall back to PNG files
  }
}

// ── Context menu ──────────────────────────────────────────────────────────

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Clip to TravelPanel',
      contexts: ['page', 'link'],
    });
  });
}

// ── Open share popup ──────────────────────────────────────────────────────

async function openSharePopup(url, title) {
  const data = await chrome.storage.sync.get('appUrl');
  const appUrl = (data.appUrl || '').replace(/\/$/, '');

  if (!appUrl) {
    // Not configured — open the extension popup which will show setup screen
    chrome.action.openPopup().catch(() => {});
    return;
  }

  const params = new URLSearchParams({ url, title: title || '', ref: 'extension' });
  const shareUrl = `${appUrl}/share?${params.toString()}`;

  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: 430,
    height: 640,
    focused: true,
  }).catch(() => {
    // Fallback to tab if popup creation fails
    chrome.tabs.create({ url: shareUrl });
  });
}

// ── Event listeners ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setIcon();
  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  setIcon();
  createContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-page') return;

  // For "link" context, clip the linked URL; for "page" context, clip the page URL
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? '' : (tab?.title || '');

  await openSharePopup(url, title);
});
