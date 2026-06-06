/* global chrome */
'use strict';

// ── Platform detection (mirrors app/lib/parse-url.ts) ─────────────────────────

const PLATFORMS = [
  { pattern: /xiaohongshu\.com|xhslink\.com|xhs\.cn/i, label: 'Xiaohongshu', color: '#ff2442', icon: '📕' },
  { pattern: /youtube\.com|youtu\.be/i,                 label: 'YouTube',      color: '#ff0000', icon: '▶' },
  { pattern: /instagram\.com/i,                          label: 'Instagram',    color: '#e1306c', icon: '📷' },
  { pattern: /tiktok\.com/i,                             label: 'TikTok',       color: '#010101', icon: '🎵' },
  { pattern: /douyin\.com/i,                             label: 'Douyin',       color: '#010101', icon: '🎵' },
  { pattern: /bilibili\.com/i,                           label: 'Bilibili',     color: '#00a1d6', icon: '📺' },
  { pattern: /weixin\.qq\.com|wechat\.com/i,            label: 'WeChat',       color: '#07c160', icon: '💬' },
  { pattern: /twitter\.com|x\.com/i,                    label: 'X',            color: '#000000', icon: '✗' },
  { pattern: /pinterest\./i,                             label: 'Pinterest',    color: '#e60023', icon: '📌' },
  { pattern: /reddit\.com/i,                             label: 'Reddit',       color: '#ff4500', icon: '🤖' },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return { label: 'Web', color: '#6366f1', icon: '🌐' };
}

// ── Utility: safe HTML escaping ────────────────────────────────────────────────

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Blocked URL check ──────────────────────────────────────────────────────────

function isBlockedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('file://')
  );
}

// ── Validate stored app URL ────────────────────────────────────────────────────

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  const root = document.getElementById('root');

  // Parallel: get active tab + stored config
  const [[tab], { travelpanelUrl, clipCount = 0 }] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.sync.get(['travelpanelUrl', 'clipCount']),
  ]);

  const pageUrl   = tab?.url   || '';
  const pageTitle = tab?.title || 'Untitled page';
  const appUrl    = (travelpanelUrl || '').replace(/\/$/, '');

  // ── BLOCKED URL ─────────────────────────────────────────────────────────────
  if (isBlockedUrl(pageUrl)) {
    root.innerHTML = `
      <div class="blocked">
        <span class="blocked-icon">🚫</span>
        <div class="blocked-title">Can't clip this page</div>
        <div class="blocked-desc">Navigate to a travel blog, YouTube video, or social post, then click the extension.</div>
      </div>`;
    return;
  }

  // ── SETUP — no URL configured ────────────────────────────────────────────────
  if (!appUrl) {
    renderSetup();
    return;
  }

  // ── CLIP VIEW ────────────────────────────────────────────────────────────────
  renderClipView(appUrl);

  // ────────────────────────────────────────────────────────────────────────────

  function renderSetup(prefill = '') {
    root.innerHTML = `
      <div class="setup">
        <div class="setup-emoji">🗺</div>
        <div class="setup-title">Connect to TravelPanel</div>
        <div class="setup-desc">
          Enter your TravelPanel URL so the extension knows where to send your clips.
        </div>
        <label class="input-label" for="url-input">TravelPanel URL</label>
        <input
          id="url-input"
          class="text-input"
          type="url"
          placeholder="https://your-app.vercel.app"
          value="${esc(prefill)}"
          spellcheck="false"
          autocomplete="off"
        />
        <div id="error-msg" class="error-banner" style="display:none"></div>
        <button id="save-btn" class="btn-primary">
          ✓ &nbsp;Connect
        </button>
      </div>`;

    const input  = document.getElementById('url-input');
    const btn    = document.getElementById('save-btn');
    const errMsg = document.getElementById('error-msg');

    input.focus();
    input.select();

    async function save() {
      const raw = input.value.trim().replace(/\/$/, '');
      errMsg.style.display = 'none';

      if (!raw) {
        errMsg.textContent = 'Please enter a URL.';
        errMsg.style.display = 'block';
        return;
      }
      if (!isValidUrl(raw)) {
        errMsg.textContent = 'That doesn\'t look like a valid URL. Include https://.';
        errMsg.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Connecting…';

      try {
        // Quick reachability check (HEAD request, best-effort)
        await fetch(raw + '/api/import', { method: 'HEAD', signal: AbortSignal.timeout(4000) }).catch(() => {});
      } catch { /* ignore */ }

      await chrome.storage.sync.set({ travelpanelUrl: raw });
      renderClipView(raw);
    }

    btn.addEventListener('click', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }

  function renderClipView(url) {
    const platform = detectPlatform(pageUrl);
    const favicon  = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(new URL(pageUrl).hostname)}`;

    root.innerHTML = `
      <div class="content">
        <span class="platform-chip" style="background:${platform.color}">
          ${platform.icon} ${esc(platform.label)}
        </span>

        <div class="page-card">
          <img class="page-favicon" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">
          <div class="page-title">${esc(pageTitle)}</div>
          <div class="page-url">${esc(pageUrl)}</div>
        </div>

        <button id="clip-btn" class="btn-primary">
          📌 &nbsp;Clip to TravelPanel
        </button>

        <button class="settings-link" id="settings-link">⚙ Change TravelPanel URL</button>
      </div>`;

    document.getElementById('clip-btn').addEventListener('click', async () => {
      const shareUrl =
        url +
        '/share?url=' + encodeURIComponent(pageUrl) +
        '&title='     + encodeURIComponent(pageTitle);

      await chrome.tabs.create({ url: shareUrl });

      // Increment clip count for the "you've clipped N times" micro-delight
      await chrome.storage.sync.set({ clipCount: clipCount + 1 });

      window.close();
    });

    document.getElementById('settings-link').addEventListener('click', () => {
      renderSetup(url);
    });
  }
})();
