const DEFAULT_TRAVELPANEL_URL = 'https://travel-panel.vercel.app';

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl        = document.getElementById('page-title');
  const urlEl          = document.getElementById('page-url');
  const faviconEl      = document.getElementById('favicon');
  const faviconPlaceholder = document.getElementById('favicon-placeholder');
  const clipBtn        = document.getElementById('clip-btn');
  const statusEl       = document.getElementById('status');
  const unsupportedEl  = document.getElementById('unsupported');
  const settingsBtn    = document.getElementById('settings-btn');

  // ── Get current tab ──────────────────────────────────────────────────────
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showError('Could not read current tab.');
    return;
  }

  const pageUrl   = tab?.url || '';
  const pageTitle = tab?.title || '';
  const favicon   = tab?.favIconUrl || '';
  const clippable = pageUrl.startsWith('http://') || pageUrl.startsWith('https://');

  // ── Populate page info ───────────────────────────────────────────────────
  if (titleEl) titleEl.textContent = pageTitle || 'Untitled page';

  if (urlEl) {
    try {
      const { hostname, pathname } = new URL(pageUrl);
      const path = pathname.length > 30 ? pathname.slice(0, 30) + '…' : pathname;
      urlEl.textContent = hostname + (path === '/' ? '' : path);
    } catch {
      urlEl.textContent = pageUrl.slice(0, 50);
    }
  }

  if (favicon && faviconEl && faviconPlaceholder) {
    faviconEl.src = favicon;
    faviconEl.style.display = 'block';
    faviconPlaceholder.style.display = 'none';
    faviconEl.onerror = () => {
      faviconEl.style.display = 'none';
      faviconPlaceholder.style.display = 'flex';
    };
  }

  // ── Handle non-clippable pages ───────────────────────────────────────────
  if (!clippable) {
    if (clipBtn) clipBtn.disabled = true;
    if (unsupportedEl) unsupportedEl.style.display = 'block';
    return;
  }

  if (clipBtn) clipBtn.disabled = false;

  // ── Load settings ────────────────────────────────────────────────────────
  let travelPanelUrl = DEFAULT_TRAVELPANEL_URL;
  try {
    const saved = await chrome.storage.sync.get('travelPanelUrl');
    if (saved.travelPanelUrl) travelPanelUrl = saved.travelPanelUrl;
  } catch { /* use default */ }

  // ── Clip button ──────────────────────────────────────────────────────────
  clipBtn?.addEventListener('click', async () => {
    const importUrl = `${travelPanelUrl}?import=${encodeURIComponent(pageUrl)}`;

    try {
      // Reuse an existing TravelPanel tab if one is open
      let target = null;
      try {
        const pattern = travelPanelUrl.replace(/\/$/, '') + '/*';
        const existing = await chrome.tabs.query({ url: pattern });
        if (existing.length > 0) target = existing[0];
      } catch { /* tabs query failed, just open a new tab */ }

      if (target?.id) {
        await chrome.tabs.update(target.id, { active: true, url: importUrl });
        if (target.windowId) {
          await chrome.windows.update(target.windowId, { focused: true });
        }
      } else {
        await chrome.tabs.create({ url: importUrl });
      }

      showSuccess('Opening TravelPanel…');
      setTimeout(() => window.close(), 700);
    } catch (err) {
      showError('Could not open TravelPanel. Check Settings.');
    }
  });

  // ── Settings button ──────────────────────────────────────────────────────
  settingsBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showSuccess(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'status success';
  }

  function showError(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'status error';
  }
});
