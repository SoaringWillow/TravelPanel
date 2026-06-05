// Generates a location-pin icon programmatically and sets it as the toolbar icon.
// Chrome shows a generic placeholder until this service worker fires on install/startup.
chrome.runtime.onInstalled.addListener(setIcon);
chrome.runtime.onStartup.addListener(setIcon);

async function setIcon() {
  try {
    const sizes = [16, 32, 48, 128];
    const imageData = {};
    for (const size of sizes) {
      imageData[size] = drawPin(size);
    }
    await chrome.action.setIcon({ imageData });
  } catch {
    // OffscreenCanvas may be unavailable in some contexts — fall back to default icon
  }
}

function drawPin(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;
  const cx = s / 2;
  const headR = s * 0.35;
  const headCY = s * 0.38;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = s * 0.1;
  ctx.shadowOffsetY = s * 0.04;

  // Pin head (circle)
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (downward triangle)
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.38, headCY + headR * 0.58);
  ctx.lineTo(cx + headR * 0.38, headCY + headR * 0.58);
  ctx.lineTo(cx, s * 0.94);
  ctx.closePath();
  ctx.fill();

  // Inner white dot
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(cx, headCY, headR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}
