// Generates and sets the extension toolbar icon using OffscreenCanvas
function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Sky-blue rounded square background
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // White map-pin teardrop
  const cx = size / 2;
  const pinR = size * 0.2;
  const pinTopY = size * 0.3;
  const tipY = size * 0.78;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, pinTopY, pinR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - pinR * 0.85, pinTopY + pinR * 0.5);
  ctx.bezierCurveTo(cx - pinR, pinTopY + pinR * 1.5, cx - pinR * 0.2, tipY - size * 0.04, cx, tipY);
  ctx.bezierCurveTo(cx + pinR * 0.2, tipY - size * 0.04, cx + pinR, pinTopY + pinR * 1.5, cx + pinR * 0.85, pinTopY + pinR * 0.5);
  ctx.closePath();
  ctx.fill();

  // Punch-out hole (accent color)
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.arc(cx, pinTopY, pinR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setIcons() {
  try {
    const imageData = {};
    for (const size of [16, 32, 48, 128]) {
      imageData[size] = drawIcon(size);
    }
    chrome.action.setIcon({ imageData });
  } catch (e) {
    console.error('[TravelPanel] Icon generation failed:', e);
  }
}

chrome.runtime.onInstalled.addListener(setIcons);
chrome.runtime.onStartup.addListener(setIcons);
