// ─── Platform detection (mirrors app/lib/parse-url.ts) ───────────────────────

const PLATFORMS = [
  { id: 'instagram',   label: 'Instagram',   patterns: [/instagram\.com/] },
  { id: 'youtube',     label: 'YouTube',     patterns: [/youtube\.com/, /youtu\.be/] },
  { id: 'tiktok',      label: 'TikTok',      patterns: [/tiktok\.com/] },
  { id: 'xiaohongshu', label: 'Xiaohongshu', patterns: [/xiaohongshu\.com/, /xhslink\.com/, /red\.com/] },
  { id: 'weibo',       label: 'Weibo',       patterns: [/weibo\.com/, /weibo\.cn/] },
  { id: 'douyin',      label: 'Douyin',      patterns: [/douyin\.com/] },
  { id: 'bilibili',    label: 'Bilibili',    patterns: [/bilibili\.com/, /b23\.tv/] },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.patterns.some((re) => re.test(url))) return p;
  }
  return { id: 'web', label: 'Web' };
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function buildShareUrl(base, pageUrl, title) {
  const cleanBase = base.replace(/\/$/, '');
  const params = new URLSearchParams({ url: pageUrl, ...(title ? { title } : {}) });
  return `${cleanBase}/share?${params}`;
}

function shortHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  // Load configured TravelPanel URL and current tab in parallel
  const [{ travelPanelUrl }, [tab]] = await Promise.all([
    chrome.storage.sync.get('travelPanelUrl'),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);

  const pageUrl   = tab?.url   ?? '';
  const pageTitle = tab?.title ?? '';

  // ── Settings button ────────────────────────────────────────────────────────
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Not configured ─────────────────────────────────────────────────────────
  if (!travelPanelUrl) {
    document.getElementById('mainView').hidden = true;
    document.getElementById('setupView').hidden = false;
    document.getElementById('goSetupBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // ── Populate page preview ──────────────────────────────────────────────────
  document.getElementById('pageTitle').textContent = pageTitle || 'Untitled page';
  document.getElementById('pageUrl').textContent   = shortHost(pageUrl);

  // Favicon: use Google's public favicon service as fallback
  const faviconEl = document.getElementById('favicon');
  faviconEl.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(shortHost(pageUrl))}&sz=32`;
  faviconEl.onerror = () => { faviconEl.style.display = 'none'; };

  // Platform chip
  const platform = detectPlatform(pageUrl);
  const chipEl   = document.getElementById('platformChip');
  chipEl.textContent  = platform.label;
  chipEl.className    = `chip ${platform.id}`;

  // ── Clip button ────────────────────────────────────────────────────────────
  document.getElementById('clipBtn').addEventListener('click', async () => {
    const shareUrl = buildShareUrl(travelPanelUrl, pageUrl, pageTitle);
    await chrome.tabs.create({ url: shareUrl });

    // Show success state briefly before popup auto-closes
    document.getElementById('successOverlay').hidden = false;
  });

  // ── Open app button ────────────────────────────────────────────────────────
  document.getElementById('openAppBtn').addEventListener('click', async () => {
    const cleanBase = travelPanelUrl.replace(/\/$/, '');
    await chrome.tabs.create({ url: cleanBase });
    window.close();
  });
})();
