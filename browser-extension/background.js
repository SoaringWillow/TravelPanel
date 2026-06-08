const DEFAULT_APP_URL = 'http://localhost:3000';

function createMapPinIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const r = size * 0.36;
  const pinTip = size * 0.93;

  // Drop shadow (soft)
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.04;

  // Pin teardrop body
  ctx.beginPath();
  ctx.arc(cx, size * 0.38, r, Math.PI, 0);
  ctx.lineTo(cx, pinTip);
  ctx.closePath();
  ctx.fillStyle = '#2563EB';
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Inner white dot
  ctx.beginPath();
  ctx.arc(cx, size * 0.38, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, ({ appUrl }) => {
      resolve(appUrl.replace(/\/$/, ''));
    });
  });
}

// Set canvas-drawn map-pin icon on install/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.action.setIcon({
      imageData: {
        16: createMapPinIcon(16),
        32: createMapPinIcon(32),
        48: createMapPinIcon(48),
        128: createMapPinIcon(128),
      },
    });
  } catch (_) {
    // setIcon may fail in some Safari environments — non-fatal
  }

  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;
  const appUrl = await getAppUrl();
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = encodeURIComponent(tab?.title || '');
  const url = encodeURIComponent(targetUrl);
  chrome.tabs.create({ url: `${appUrl}/share?url=${url}&title=${title}` });
});
