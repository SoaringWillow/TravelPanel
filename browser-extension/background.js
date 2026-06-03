const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (items) => {
      resolve(items.appUrl.replace(/\/$/, ''));
    });
  });
}

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Background circle — deep blue
  const grad = ctx.createRadialGradient(s * 0.45, s * 0.38, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, '#3B82F6');
  grad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, 2 * Math.PI);
  ctx.fill();

  // Map pin shape (white)
  ctx.fillStyle = 'white';
  const pinCx = s / 2;
  const pinTop = s * 0.18;
  const pinR = s * 0.22;
  const pinTip = s * 0.78;

  ctx.beginPath();
  ctx.arc(pinCx, pinTop + pinR, pinR, Math.PI, 0);
  ctx.quadraticCurveTo(pinCx + pinR + s * 0.04, pinTop + pinR * 1.6, pinCx, pinTip);
  ctx.quadraticCurveTo(pinCx - pinR - s * 0.04, pinTop + pinR * 1.6, pinCx - pinR, pinTop + pinR);
  ctx.closePath();
  ctx.fill();

  // Inner dot (blue hole in pin)
  ctx.fillStyle = '#1D4ED8';
  ctx.beginPath();
  ctx.arc(pinCx, pinTop + pinR, pinR * 0.4, 0, 2 * Math.PI);
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

async function setIcon() {
  try {
    const imageData = {
      16: drawIcon(16),
      32: drawIcon(32),
      48: drawIcon(48),
      128: drawIcon(128),
    };
    await chrome.action.setIcon({ imageData });
  } catch {
    // Static icons in manifest serve as fallback
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await setIcon();

  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link', 'selection'],
  });
});

chrome.runtime.onStartup.addListener(setIcon);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;
  const appUrl = await getAppUrl();
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'clip-current-page') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const appUrl = await getAppUrl();
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || '')}`;
  chrome.tabs.create({ url: shareUrl });
});
