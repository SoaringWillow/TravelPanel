// Renders the TP logo to canvas and sets the toolbar icon dynamically.
// Falls back to the static PNG files if canvas is unavailable.

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.5;

  // Background circle — indigo-600 (#4f46e5)
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fillStyle = '#4f46e5';
  ctx.fill();

  // Airplane glyph (simplified path scaled to icon size)
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.55)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', r, r + size * 0.03);

  return ctx.getImageData(0, 0, size, size);
}

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.action.setIcon({
      imageData: {
        16: drawIcon(16),
        32: drawIcon(32),
        48: drawIcon(48),
        128: drawIcon(128),
      },
    });
  } catch {
    // Static PNG fallback — already set in manifest
  }
});
