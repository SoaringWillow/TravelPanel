// Popup logic — gets current tab info, opens share page

const PLATFORMS = [
  { id: 'instagram', re: /instagram\.com/,              label: '📷 Instagram', chip: 'chip-instagram' },
  { id: 'youtube',   re: /youtube\.com|youtu\.be/,      label: '▶️ YouTube',   chip: 'chip-youtube'   },
  { id: 'xhs',       re: /xiaohongshu\.com|xhslink\.com/, label: '📕 小红书',  chip: 'chip-xhs'       },
  { id: 'douyin',    re: /douyin\.com|iesdouyin\.com/,  label: '🎵 Douyin',    chip: 'chip-douyin'    },
  { id: 'tiktok',    re: /tiktok\.com/,                 label: '🎵 TikTok',    chip: 'chip-tiktok'    },
  { id: 'bilibili',  re: /bilibili\.com/,               label: '📺 Bilibili',  chip: 'chip-bilibili'  },
  { id: 'twitter',   re: /twitter\.com|x\.com/,         label: '𝕏 Twitter/X',  chip: 'chip-twitter'   },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.re.test(url)) return p;
  }
  return { id: 'other', label: '🌐 Web', chip: 'chip-other' };
}

function truncateHost(url) {
  try {
    const u = new URL(url);
    const path = u.hostname + u.pathname;
    return path.length > 44 ? path.slice(0, 44) + '…' : path;
  } catch {
    return url.slice(0, 44);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

async function getSettings() {
  return new Promise(r => chrome.storage.sync.get({ travelPanelUrl: '' }, r));
}

async function init() {
  const pageInfo  = document.getElementById('pageInfo');
  const clipBtn   = document.getElementById('clipBtn');
  const statusEl  = document.getElementById('status');

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  const { travelPanelUrl } = await getSettings();

  // ── Not configured ──────────────────────────────────────────────────────
  if (!travelPanelUrl) {
    pageInfo.innerHTML = `
      <div class="configure-prompt">
        <p>Set your TravelPanel URL<br>to start clipping.</p>
        <button class="configure-btn" id="configureBtn">Configure →</button>
      </div>
    `;
    document.getElementById('configureBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // ── Get current tab ─────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url ?? '';
  const title = tab?.title ?? 'Untitled';

  // Chrome internal / extension pages can't be clipped
  if (!url || url.startsWith('chrome') || url.startsWith('about:') || url.startsWith('edge')) {
    pageInfo.innerHTML = `
      <div class="blocked-notice">
        <span>⚠️</span>
        <span>Navigate to a webpage to clip it.</span>
      </div>
    `;
    return;
  }

  const platform = detectPlatform(url);
  const faviconSrc = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;

  pageInfo.innerHTML = `
    <div class="page-header">
      <img class="page-favicon" src="${escapeHtml(faviconSrc)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="page-title">${escapeHtml(title)}</div>
    </div>
    <div class="page-url">${escapeHtml(truncateHost(url))}</div>
    <div class="platform-chip ${platform.chip}">${platform.label}</div>
  `;

  clipBtn.disabled = false;

  // ── Clip action ─────────────────────────────────────────────────────────
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    try {
      const shareUrl = new URL('/share', travelPanelUrl);
      shareUrl.searchParams.set('url', url);
      shareUrl.searchParams.set('title', title);
      shareUrl.searchParams.set('source', 'browser-extension');
      await chrome.tabs.create({ url: shareUrl.toString() });
      window.close();
    } catch (err) {
      statusEl.textContent = 'Error: check your TravelPanel URL in settings';
      statusEl.className = 'footer status-error';
      clipBtn.disabled = false;
    }
  });
}

init().catch(err => {
  document.getElementById('pageInfo').innerHTML =
    `<div class="blocked-notice"><span>⚠️</span><span>${escapeHtml(err.message)}</span></div>`;
});
