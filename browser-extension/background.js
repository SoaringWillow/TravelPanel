'use strict';

const DEFAULT_TRAVELPANEL_URL = '';

// ── Install / startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  setActionIcon();
  setupContextMenus();

  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(() => {
  setActionIcon();
  setupContextMenus();
});

// ── Context menus ────────────────────────────────────────────────────────────

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
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
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelPanelUrl } = await chrome.storage.sync.get({
    travelPanelUrl: DEFAULT_TRAVELPANEL_URL,
  });

  if (!travelPanelUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const targetUrl = info.menuItemId === 'save-link' ? info.linkUrl : tab.url;
  const title     = info.menuItemId === 'save-link' ? (info.linkText || info.linkUrl) : (tab.title || '');

  const shareUrl = new URL('/share', travelPanelUrl);
  shareUrl.searchParams.set('url', targetUrl);
  shareUrl.searchParams.set('title', title);

  chrome.tabs.create({ url: shareUrl.toString() });
});

// ── Dynamic action icon using OffscreenCanvas ────────────────────────────────

function setActionIcon() {
  try {
    const sizes   = [16, 32, 48, 128];
    const imgData = {};

    for (const size of sizes) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx    = canvas.getContext('2d');

      // Blue rounded square background
      const r = size * 0.22;
      ctx.fillStyle = '#2563EB';
      roundedRect(ctx, 0, 0, size, size, r);
      ctx.fill();

      // White location pin
      drawPin(ctx, size);

      imgData[size] = ctx.getImageData(0, 0, size, size);
    }

    chrome.action.setIcon({ imageData: imgData }).catch(() => {});
  } catch {
    // OffscreenCanvas not available — use default icon
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPin(ctx, size) {
  const cx = size / 2;
  const pinTop    = size * 0.17;
  const circleR   = size * 0.24;
  const circleCy  = pinTop + circleR;
  const pointY    = size * 0.83;

  ctx.fillStyle = 'white';
  ctx.beginPath();

  // Pin head (circle)
  ctx.arc(cx, circleCy, circleR, Math.PI, 0, false);

  // Pin body (triangle down to point)
  ctx.lineTo(cx + circleR * 0.55, circleCy + circleR * 0.6);
  ctx.quadraticCurveTo(cx, pointY, cx - circleR * 0.55, circleCy + circleR * 0.6);
  ctx.lineTo(cx - circleR, circleCy);
  ctx.closePath();
  ctx.fill();

  // Inner dot (hole in pin head)
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(cx, circleCy, circleR * 0.42, 0, Math.PI * 2);
  ctx.fill();
}
