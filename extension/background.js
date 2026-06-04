const DEFAULT_APP_URL = 'http://localhost:3000';

// Draw a map-pin icon at the given pixel size using OffscreenCanvas.
function drawPin(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 24;
  const cx = 12 * s;
  const cy = 9 * s;
  const r = 7 * s;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 2 * s;
  ctx.shadowOffsetY = s;

  // Purple circle head
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Tail (triangle pointing down)
  ctx.beginPath();
  ctx.moveTo(cx - 4 * s, cy + 5 * s);
  ctx.lineTo(cx + 4 * s, cy + 5 * s);
  ctx.lineTo(cx, 22 * s);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // White inner dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

async function updateIcon() {
  const imageData = {};
  for (const size of [16, 32, 48, 128]) {
    imageData[size] = drawPin(size);
  }
  await chrome.action.setIcon({ imageData });
}

chrome.runtime.onInstalled.addListener(async () => {
  await updateIcon();

  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.runtime.onStartup.addListener(updateIcon);

async function openInTravelPanel(url, appUrl) {
  const targetUrl = `${appUrl}/?import=${encodeURIComponent(url)}`;
  try {
    const origin = new URL(appUrl).origin;
    const existing = await chrome.tabs.query({ url: `${origin}/*` });
    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { url: targetUrl, active: true });
      if (existing[0].windowId != null) {
        await chrome.windows.update(existing[0].windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: targetUrl });
    }
  } catch {
    await chrome.tabs.create({ url: targetUrl });
  }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const url = info.menuItemId === 'clip-link' ? info.linkUrl : info.pageUrl;
  const stored = await chrome.storage.sync.get('appUrl');
  const appUrl = stored.appUrl || DEFAULT_APP_URL;
  await openInTravelPanel(url, appUrl);
});
