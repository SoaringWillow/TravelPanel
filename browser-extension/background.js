// Service worker — sets extension icon on install/startup

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 24; // scale factor (design at 24px)

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Map pin body (teardrop)
  const cx = 12 * s;
  const pinTopY = 4 * s;
  const pinR = 5 * s;
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(cx, pinTopY + pinR, pinR, Math.PI, 0);
  ctx.bezierCurveTo(
    cx + pinR, pinTopY + pinR * 2,
    cx + pinR * 0.4, pinTopY + pinR * 3.2,
    cx, pinTopY + pinR * 4.2
  );
  ctx.bezierCurveTo(
    cx - pinR * 0.4, pinTopY + pinR * 3.2,
    cx - pinR, pinTopY + pinR * 2,
    cx - pinR, pinTopY + pinR
  );
  ctx.closePath();
  ctx.fill();

  // Inner dot
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(cx, pinTopY + pinR, pinR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setIcon() {
  try {
    chrome.action.setIcon({
      imageData: {
        16: drawIcon(16),
        48: drawIcon(48),
        128: drawIcon(128),
      },
    });
  } catch (_) {
    // Non-critical
  }
}

chrome.runtime.onInstalled.addListener(setIcon);
chrome.runtime.onStartup.addListener(setIcon);
