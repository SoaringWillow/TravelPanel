const DEFAULT_URL = 'https://travelpanel.vercel.app';

chrome.runtime.onInstalled.addListener(onInit);
chrome.runtime.onStartup.addListener(setIcon);

async function onInit() {
  setIcon();
  setupContextMenu();
}

function setIcon() {
  const sizes = [16, 32, 48, 128];
  const imageData = {};

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Indigo circle background
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // White map pin
    const cx = size / 2;
    const pinRadius = size * 0.22;
    const pinTopCy = size * 0.38;
    const pinTipY = size * 0.78;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, pinTopCy, pinRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - pinRadius * 0.75, pinTopCy + pinRadius * 0.6);
    ctx.lineTo(cx + pinRadius * 0.75, pinTopCy + pinRadius * 0.6);
    ctx.lineTo(cx, pinTipY);
    ctx.closePath();
    ctx.fill();

    // Inner dot (hole in pin head)
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(cx, pinTopCy, pinRadius * 0.42, 0, Math.PI * 2);
    ctx.fill();

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  chrome.action.setIcon({ imageData });
}

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Clip this page to TravelPanel',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'clip-link',
      title: 'Clip this link to TravelPanel',
      contexts: ['link'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { travelpanelUrl = DEFAULT_URL } = await chrome.storage.sync.get('travelpanelUrl');

  let url = '';
  let title = '';

  if (info.menuItemId === 'clip-link') {
    url = info.linkUrl ?? '';
  } else {
    url = info.pageUrl ?? '';
    title = tab?.title ?? '';
  }

  if (!url) return;

  const shareUrl = `${travelpanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
