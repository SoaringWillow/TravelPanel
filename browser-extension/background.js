const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function createIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Teal/cyan rounded-rect background
  ctx.fillStyle = '#0891B2';
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, s * 0.22);
  ctx.fill();

  // White location pin: circle head + triangular tail
  const cx = s / 2;
  const cy = s * 0.37;
  const pr = s * 0.21;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.moveTo(cx - pr * 0.65, cy + pr * 0.5);
  ctx.lineTo(cx + pr * 0.65, cy + pr * 0.5);
  ctx.lineTo(cx, cy + pr * 2.5);
  ctx.closePath();
  ctx.fill();

  // Hollow center dot (same color as background)
  ctx.fillStyle = '#0891B2';
  ctx.beginPath();
  ctx.arc(cx, cy, pr * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

function setIcon() {
  const imageData = {};
  for (const size of [16, 32, 48, 128]) {
    imageData[size] = createIcon(size);
  }
  chrome.action.setIcon({ imageData });
}

chrome.runtime.onInstalled.addListener(() => {
  setIcon();

  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link']
  });
});

// Re-draw icon on browser startup (service workers restart)
chrome.runtime.onStartup.addListener(setIcon);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  const title = info.linkUrl ? '' : (tab?.title || '');
  const { appUrl } = await chrome.storage.sync.get(['appUrl']);
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
