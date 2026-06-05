'use strict';

// Generates the extension toolbar icon using OffscreenCanvas (no PNG files needed).
// Draws an indigo circle with a white map-pin shape.

function makeIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const s      = size;
  const cx     = s / 2;

  // Indigo circle background
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();

  // White map pin
  const headY = s * 0.34;
  const headR = s * 0.20;

  ctx.fillStyle = '#ffffff';

  // Pin head
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (curved teardrop pointing down)
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.62, headY + headR * 0.55);
  ctx.quadraticCurveTo(cx - headR * 0.18, headY + headR * 2.1, cx, s * 0.83);
  ctx.quadraticCurveTo(cx + headR * 0.18, headY + headR * 2.1, cx + headR * 0.62, headY + headR * 0.55);
  ctx.closePath();
  ctx.fill();

  // Indigo inner dot (hole in pin head)
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, headY, headR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

function applyIcon() {
  const imageData = {};
  for (const size of [16, 32, 48, 128]) {
    imageData[size] = makeIcon(size);
  }
  chrome.action.setIcon({ imageData }).catch(() => {});
}

// Set icon on install/update and on every service-worker start
chrome.runtime.onInstalled.addListener(applyIcon);
applyIcon();
