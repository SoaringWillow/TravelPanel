'use strict';

// Generate a simple location-pin icon using OffscreenCanvas
function createIconImageData(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size * 0.42;
  const r = size * 0.32;

  // White background (transparent-friendly)
  ctx.clearRect(0, 0, size, size);

  // Drop shadow for depth
  ctx.shadowColor = 'rgba(79, 70, 229, 0.4)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;

  // Pin head (filled indigo circle)
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Pin tail (teardrop / triangle)
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + r * 0.6);
  ctx.quadraticCurveTo(cx, size * 0.96, cx, size * 0.96);
  ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 0.6, cx + r * 0.55, cy + r * 0.6);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // White dot in the center of the pin head
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

// Set the extension icon dynamically on install / startup
function setIcons() {
  try {
    chrome.action.setIcon({
      imageData: {
        16: createIconImageData(16),
        48: createIconImageData(48),
        128: createIconImageData(128),
      },
    });
  } catch (e) {
    // Silently fail — default icon will be used
  }
}

chrome.runtime.onInstalled.addListener(setIcons);
chrome.runtime.onStartup.addListener(setIcons);
