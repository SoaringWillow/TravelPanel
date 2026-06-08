const DEFAULT_APP_URL = 'http://localhost:3000';

// ─── Icon drawing ─────────────────────────────────────────────────────────────

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue rounded square
  const r = Math.max(2, Math.floor(size * 0.18));
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // White 'T' lettermark
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(size * 0.6)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', size / 2, size / 2 + Math.floor(size * 0.04));

  return ctx.getImageData(0, 0, size, size);
}

async function setIcon() {
  try {
    await chrome.action.setIcon({
      imageData: {
        16: drawIcon(16),
        32: drawIcon(32),
        48: drawIcon(48),
        128: drawIcon(128),
      },
    });
  } catch {
    // icon drawing not critical
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setIcon();
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setIcon();
});

// ─── Context menus ────────────────────────────────────────────────────────────

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-page',
      title: 'Save page to TravelPanel',
      contexts: ['page', 'frame'],
    });
    chrome.contextMenus.create({
      id: 'save-link',
      title: 'Save link to TravelPanel',
      contexts: ['link'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  const base = appUrl.replace(/\/$/, '');

  if (info.menuItemId === 'save-page' && tab) {
    const url = encodeURIComponent(tab.url || '');
    const title = encodeURIComponent(tab.title || '');
    chrome.tabs.create({ url: `${base}/share?url=${url}&title=${title}` });
  } else if (info.menuItemId === 'save-link' && info.linkUrl) {
    const url = encodeURIComponent(info.linkUrl);
    chrome.tabs.create({ url: `${base}/share?url=${url}` });
  }
});
