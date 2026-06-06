chrome.runtime.onInstalled.addListener(() => {
  setExtensionIcon();
});

function setExtensionIcon() {
  const sizes = [16, 32, 48, 128];
  const imageData = {};
  for (const size of sizes) {
    imageData[size] = drawMapPinIcon(size);
  }
  chrome.action.setIcon({ imageData }).catch(() => {});
}

function drawMapPinIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Rounded rect background with sky→violet gradient
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#0ea5e9');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;

  const r = Math.round(s * 0.22);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(s - r, 0);
  ctx.quadraticCurveTo(s, 0, s, r);
  ctx.lineTo(s, s - r);
  ctx.quadraticCurveTo(s, s, s - r, s);
  ctx.lineTo(r, s);
  ctx.quadraticCurveTo(0, s, 0, s - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // White map pin: circle head + triangular tail
  const cx = s * 0.5;
  const cy = s * 0.41;
  const pinR = s * 0.21;

  ctx.fillStyle = 'white';

  // Pin head (circle)
  ctx.beginPath();
  ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (triangle overlapping the circle bottom)
  ctx.beginPath();
  ctx.moveTo(cx - pinR * 0.68, cy + pinR * 0.28);
  ctx.lineTo(cx, cy + pinR * 2.35);
  ctx.lineTo(cx + pinR * 0.68, cy + pinR * 0.28);
  ctx.closePath();
  ctx.fill();

  // Inner dot using gradient color to give the pin a "hole"
  ctx.fillStyle = '#6d28d9';
  ctx.beginPath();
  ctx.arc(cx, cy, pinR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}
