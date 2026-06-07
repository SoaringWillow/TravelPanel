// Draw a location-pin icon via OffscreenCanvas (works in Chrome MV3 service workers)
function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.14;

  // Rounded background
  ctx.fillStyle = '#0D9488';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // White location pin
  const cx = size / 2;
  const pinTop = size * 0.18;
  const pinR = size * 0.26;
  const pinTip = size * 0.82;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR, Math.PI, 0); // top arc
  ctx.bezierCurveTo(cx + pinR, pinTop + pinR * 1.6, cx + pinR * 0.4, pinTop + pinR * 2.2, cx, pinTip);
  ctx.bezierCurveTo(cx - pinR * 0.4, pinTop + pinR * 2.2, cx - pinR, pinTop + pinR * 1.6, cx - pinR, pinTop + pinR);
  ctx.closePath();
  ctx.fill();

  // Teal inner circle
  ctx.fillStyle = '#0D9488';
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

async function setCanvasIcon() {
  try {
    const imageData = {
      16: drawIcon(16),
      32: drawIcon(32),
      48: drawIcon(48),
      128: drawIcon(128),
    };
    await chrome.action.setIcon({ imageData });
  } catch {
    // OffscreenCanvas may not be available in all environments; fall back to default
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setCanvasIcon();

  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

// Re-draw icon on startup (service worker may restart)
chrome.runtime.onStartup.addListener(setCanvasIcon);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const { appUrl } = await chrome.storage.sync.get('appUrl');
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;

  const target = `${appUrl.replace(/\/$/, '')}/?import=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: target });
});
