// Draw the TravelPanel icon using OffscreenCanvas (available in MV3 service workers)
async function generateIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const s      = size;

  // ── Background: indigo rounded rectangle ──────────────────────────────
  const radius = s * 0.22;
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(s - radius, 0);
  ctx.quadraticCurveTo(s, 0, s, radius);
  ctx.lineTo(s, s - radius);
  ctx.quadraticCurveTo(s, s, s - radius, s);
  ctx.lineTo(radius, s);
  ctx.quadraticCurveTo(0, s, 0, s - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // ── Map pin ────────────────────────────────────────────────────────────
  const cx    = s * 0.5;
  const cy    = s * 0.42;
  const headR = s * 0.23;

  // Pin head (white circle)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy, headR, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (white teardrop)
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.55, cy + headR * 0.55);
  ctx.lineTo(cx, cy + headR * 2.0);
  ctx.lineTo(cx + headR * 0.55, cy + headR * 0.55);
  ctx.closePath();
  ctx.fill();

  // Inner hole (indigo dot for depth)
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.arc(cx, cy, headR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

async function setIcons() {
  const [i16, i48, i128] = await Promise.all([
    generateIcon(16),
    generateIcon(48),
    generateIcon(128),
  ]);
  chrome.action.setIcon({ imageData: { 16: i16, 48: i48, 128: i128 } });
}

chrome.runtime.onInstalled.addListener(setIcons);
chrome.runtime.onStartup.addListener(setIcons);
