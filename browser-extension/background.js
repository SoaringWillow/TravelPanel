const DEFAULT_PANEL_URL = 'https://travelpanel.vercel.app';

// Draw the extension icon programmatically — no PNG files needed
function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Sky-blue rounded background
  const r = size * 0.22;
  ctx.fillStyle = '#0EA5E9';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // White map-pin teardrop
  const cx = size / 2;
  const pinTop = size * 0.18;
  const pinR = size * 0.22;
  const tailY = size * 0.78;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR, Math.PI, 0);
  ctx.quadraticCurveTo(cx + pinR * 1.1, pinTop + pinR * 2.2, cx, tailY);
  ctx.quadraticCurveTo(cx - pinR * 1.1, pinTop + pinR * 2.2, cx - pinR, pinTop + pinR);
  ctx.arc(cx, pinTop + pinR, pinR, Math.PI, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Inner dot
  ctx.fillStyle = '#0EA5E9';
  ctx.beginPath();
  ctx.arc(cx, pinTop + pinR, pinR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setExtensionIcon() {
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
    // OffscreenCanvas unavailable in this context — use default
  }
}

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-page',
      title: 'Clip to TravelPanel',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'clip-link',
      title: 'Clip this link to TravelPanel',
      contexts: ['link'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
  setExtensionIcon();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
  setExtensionIcon();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!['clip-page', 'clip-link'].includes(info.menuItemId)) return;

  const { panelUrl = DEFAULT_PANEL_URL } = await chrome.storage.sync.get('panelUrl');
  const base = panelUrl.replace(/\/$/, '');

  const url = info.linkUrl || tab?.url || '';
  const title = info.menuItemId === 'clip-link' ? '' : (tab?.title || '');

  openClipWindow(base, url, title);
});

export function openClipWindow(baseUrl, url, title) {
  const shareUrl =
    `${baseUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    (title ? `&title=${encodeURIComponent(title)}` : '') +
    `&source=extension`;

  chrome.windows.create({
    url: shareUrl,
    type: 'popup',
    width: 440,
    height: 580,
    focused: true,
  });
}
