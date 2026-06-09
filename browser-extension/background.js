// ─── Icon generation ─────────────────────────────────────────────────────────

function drawIcon(size) {
  try {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const r = size * 0.2;

    // Indigo background
    ctx.fillStyle = '#4F46E5';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, r);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }

    // White map pin
    const cx = size * 0.5;
    const cy = size * 0.4;
    const pinR = size * 0.22;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.arc(cx, cy, pinR * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Pin tail
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx - pinR * 0.6, cy + pinR * 0.55);
    ctx.lineTo(cx, cy + pinR * 2.5);
    ctx.lineTo(cx + pinR * 0.6, cy + pinR * 0.55);
    ctx.closePath();
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  } catch {
    return null;
  }
}

function setDynamicIcon() {
  const sizes = [16, 32, 48, 128];
  const imageData = {};
  let any = false;
  for (const s of sizes) {
    const d = drawIcon(s);
    if (d) { imageData[s] = d; any = true; }
  }
  if (any) {
    chrome.action.setIcon({ imageData }).catch(() => {});
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-to-travelpanel',
      title: 'Clip to TravelPanel',
      contexts: ['page', 'link'],
    });
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setDynamicIcon();
  setupContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  setDynamicIcon();
  setupContextMenu();
});

// ─── Context menu handler ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';
  await openSharePage(url, title);
});

// ─── Message handler (from popup) ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'clip') {
    openSharePage(message.url, message.title)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep channel open for async response
  }
});

// ─── Core: open TravelPanel share page ────────────────────────────────────────

async function openSharePage(url, title) {
  const { travelPanelUrl = 'https://travel-panel.vercel.app' } =
    await chrome.storage.sync.get('travelPanelUrl');
  const base = travelPanelUrl.replace(/\/$/, '');
  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Reuse an existing TravelPanel tab if one is open
  const tabs = await chrome.tabs.query({ url: `${base}/*` });
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { url: shareUrl, active: true });
    const win = tabs[0].windowId;
    if (win) await chrome.windows.update(win, { focused: true });
  } else {
    await chrome.tabs.create({ url: shareUrl });
  }
}
