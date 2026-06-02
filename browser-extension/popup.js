// ── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

const PLATFORM_INFO = {
  wechat:      { label: 'WeChat',           color: '#07C160', emoji: '💬' },
  xiaohongshu: { label: 'Little Red Book',  color: '#FF2442', emoji: '📕' },
  douyin:      { label: 'Douyin / TikTok',  color: '#161823', emoji: '🎵' },
  bilibili:    { label: 'Bilibili',         color: '#00AEEC', emoji: '📺' },
  youtube:     { label: 'YouTube',          color: '#FF0000', emoji: '▶️' },
  instagram:   { label: 'Instagram',        color: '#E1306C', emoji: '📸' },
  tiktok:      { label: 'TikTok',           color: '#010101', emoji: '🎵' },
  other:       { label: 'Web',             color: '#6366F1', emoji: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  try {
    const h = new URL(url).hostname;
    if (h.includes('weixin.qq.com') || h.includes('mp.weixin')) return 'wechat';
    if (h.includes('xiaohongshu.com') || h.includes('xhslink.com') || h.includes('xhs.link')) return 'xiaohongshu';
    if (h.includes('douyin.com') || h.includes('iesdouyin.com')) return 'douyin';
    if (h.includes('bilibili.com') || h.includes('b23.tv')) return 'bilibili';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('instagram.com')) return 'instagram';
    if (h.includes('tiktok.com')) return 'tiktok';
  } catch { /* invalid URL */ }
  return 'other';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(el)  { el.style.display = ''; }
function hide(el)  { el.style.display = 'none'; }

function setError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  show(el);
}

function clearError() {
  const el = document.getElementById('error-msg');
  hide(el);
}

async function getAppUrl() {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  return (appUrl || '').replace(/\/$/, '');
}

async function openSharePage(tabUrl, tabTitle, boardMode = false) {
  const appUrl = await getAppUrl();
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    window.close();
    return;
  }

  const params = new URLSearchParams({ url: tabUrl, title: tabTitle });
  const shareUrl = `${appUrl}/share?${params.toString()}`;

  // Focus existing TravelPanel tab if one is open, otherwise open new tab
  const existing = await chrome.tabs.query({ url: `${appUrl}/*` });
  if (existing.length > 0 && existing[0].id != null) {
    await chrome.tabs.update(existing[0].id, { url: shareUrl, active: true });
    const win = existing[0].windowId;
    if (win != null) await chrome.windows.update(win, { focused: true });
  } else {
    await chrome.tabs.create({ url: shareUrl });
  }

  window.close();
}

// ── Inline save (calls /api/import, saves to IndexedDB via shared page) ───────
// We open the share page but with a "quick save" intent — the share page handles
// all persistence. This keeps one source of truth.

async function saveToInbox(tabUrl, tabTitle) {
  const appUrl = await getAppUrl();
  if (!appUrl) {
    show(document.getElementById('setup-view'));
    hide(document.getElementById('clip-view'));
    return;
  }

  // Disable buttons during save
  const saveBtn = document.getElementById('save-inbox-btn');
  const openBtn = document.getElementById('open-travelpanel-btn');
  saveBtn.disabled = true;
  openBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Saving…';

  try {
    // POST to the TravelPanel /api/import endpoint directly from the extension.
    // Extensions bypass CORS for declared host_permissions ("https://*/*").
    const res = await fetch(`${appUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tabUrl }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Show success with extraction metadata
    const locationCount = data.locations?.length ?? 0;
    const substanceCount = data.substance?.length ?? 0;

    document.getElementById('success-subtitle').textContent =
      locationCount > 0
        ? `Found ${locationCount} spot${locationCount !== 1 ? 's' : ''} + ${substanceCount} wisdom item${substanceCount !== 1 ? 's' : ''}`
        : 'AI extraction complete.';

    if (locationCount > 0 || substanceCount > 0) {
      const metaEl = document.getElementById('success-meta');
      if (locationCount > 0) {
        document.getElementById('meta-locations').textContent = `📍 ${locationCount} spot${locationCount !== 1 ? 's' : ''}`;
      }
      if (substanceCount > 0) {
        document.getElementById('meta-substance').textContent = `💡 ${substanceCount} tip${substanceCount !== 1 ? 's' : ''}`;
      }
      show(metaEl);
    }

    // Store clip in extension storage so TravelPanel can import it on next open
    const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
    pendingClips.push({
      id: crypto.randomUUID(),
      url: tabUrl,
      savedAt: Date.now(),
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: undefined,
      ...data,
    });
    await chrome.storage.local.set({ pendingClips });

    hide(document.getElementById('clip-view'));
    show(document.getElementById('success-view'));

    // Wire up "Open TravelPanel" button in success view
    document.getElementById('open-app-btn').addEventListener('click', async () => {
      const existing = await chrome.tabs.query({ url: `${appUrl}/*` });
      if (existing.length > 0 && existing[0].id != null) {
        await chrome.tabs.update(existing[0].id, { active: true });
        await chrome.windows.update(existing[0].windowId, { focused: true });
      } else {
        await chrome.tabs.create({ url: appUrl });
      }
      window.close();
    });

  } catch (err) {
    // Fallback: open the share page directly so the user can still save
    saveBtn.disabled = false;
    openBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/>
      </svg>
      Save to Inbox`;
    setError('Quick save failed — try "Choose Board" instead.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Setup view fallback
  document.getElementById('go-settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Check app URL first
  const appUrl = await getAppUrl();
  if (!appUrl) {
    hide(document.getElementById('clip-view'));
    show(document.getElementById('setup-view'));
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl   = tab?.url   ?? '';
  const tabTitle = tab?.title ?? '';

  // Populate page preview
  document.getElementById('page-title').textContent = tabTitle || '(No title)';
  document.getElementById('page-url').textContent   = tabUrl;

  // Favicon
  const faviconImg = document.getElementById('favicon');
  const faviconPlaceholder = document.getElementById('favicon-placeholder');
  if (tab?.favIconUrl) {
    faviconImg.src = tab.favIconUrl;
    faviconImg.onload = () => {
      show(faviconImg);
      hide(faviconPlaceholder);
    };
  }

  // Platform badge
  const platform = detectPlatform(tabUrl);
  const info = PLATFORM_INFO[platform] ?? PLATFORM_INFO.other;
  if (platform !== 'other') {
    const badge = document.getElementById('platform-badge');
    badge.textContent = `${info.emoji} ${info.label}`;
    badge.style.backgroundColor = info.color;
    show(document.getElementById('platform-row'));
  }

  // Save to Inbox button
  document.getElementById('save-inbox-btn').addEventListener('click', () => {
    clearError();
    saveToInbox(tabUrl, tabTitle);
  });

  // Choose Board button — open share page
  document.getElementById('open-travelpanel-btn').addEventListener('click', () => {
    openSharePage(tabUrl, tabTitle, true);
  });
});
