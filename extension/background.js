'use strict';

async function getTravelPanelUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ travelPanelUrl: 'http://localhost:3000' }, data => {
      resolve((data.travelPanelUrl || 'http://localhost:3000').replace(/\/$/, ''));
    });
  });
}

function buildShareUrl(baseUrl, url, title) {
  return (
    baseUrl +
    '/share?url=' +
    encodeURIComponent(url) +
    (title ? '&title=' + encodeURIComponent(title) : '')
  );
}

// Generate a canvas icon so no PNG files are needed
function makeIconData(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  // Gradient background circle
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // White map-pin shape
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const pinR = r * 0.32;
  const pinX = r;
  const pinY = r * 0.72;

  // Circle top of pin
  ctx.beginPath();
  ctx.arc(pinX, pinY, pinR, 0, Math.PI * 2);
  ctx.fill();

  // Triangle tail pointing down
  ctx.beginPath();
  ctx.moveTo(pinX - pinR * 0.75, pinY + pinR * 0.4);
  ctx.lineTo(pinX + pinR * 0.75, pinY + pinR * 0.4);
  ctx.lineTo(pinX, pinY + pinR * 1.8);
  ctx.closePath();
  ctx.fill();

  // Hole in pin
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(pinX, pinY, pinR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function applyIcon() {
  try {
    chrome.action.setIcon({
      imageData: {
        16: makeIconData(16),
        32: makeIconData(32),
        48: makeIconData(48),
        128: makeIconData(128),
      },
    });
  } catch {
    // Silently ignore if canvas unavailable
  }
}

chrome.runtime.onInstalled.addListener(() => {
  applyIcon();

  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

// Re-apply icon on browser startup
chrome.runtime.onStartup.addListener(applyIcon);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === 'save-link'
    ? info.linkUrl
    : info.pageUrl;

  if (!url) return;

  const title = (info.menuItemId === 'save-link') ? '' : (tab?.title || '');
  const baseUrl = await getTravelPanelUrl();
  const shareUrl = buildShareUrl(baseUrl, url, title);

  chrome.tabs.create({ url: shareUrl });
});
