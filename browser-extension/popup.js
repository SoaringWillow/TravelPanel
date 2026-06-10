// TravelPanel Clipper — popup.js

const PLATFORM_CONFIG = {
  xiaohongshu: { label: 'Xiaohongshu', color: '#FF2442', bg: 'rgba(255,36,66,0.12)' },
  wechat:      { label: 'WeChat',       color: '#07C160', bg: 'rgba(7,193,96,0.12)' },
  douyin:      { label: 'Douyin/TikTok',color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  bilibili:    { label: 'Bilibili',     color: '#00AEEC', bg: 'rgba(0,174,236,0.12)' },
  other:       { label: 'Web',          color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url)) return 'xiaohongshu';
  if (/weixin\.qq\.com|mp\.weixin/.test(url))               return 'wechat';
  if (/douyin\.com|iesdouyin\.com|tiktok\.com/.test(url))   return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url))                    return 'bilibili';
  return 'other';
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : (str || '');
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

function showStatus(type, iconPath, text) {
  const bar = $('statusBar');
  bar.className = `status-bar show ${type}`;
  $('statusIcon').innerHTML = iconPath;
  $('statusText').textContent = text;
}

function hideStatus() { $('statusBar').className = 'status-bar'; }

// ── Main ─────────────────────────────────────────────────────────────────────

async function init() {
  // Load TravelPanel base URL from storage
  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: '' });
  const baseUrl = (travelPanelUrl || '').replace(/\/$/, '');

  // Config warning
  if (!baseUrl) {
    $('configWarn').classList.add('show');
    $('configLink').addEventListener('click', e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  }

  // Open-app link
  $('openAppLink').addEventListener('click', e => {
    e.preventDefault();
    if (baseUrl) chrome.tabs.create({ url: baseUrl });
    else chrome.runtime.openOptionsPage();
  });

  $('footerSettings').addEventListener('click', e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  $('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    $('noUrl').style.display = 'block';
    return;
  }

  if (!tab || !tab.url || /^chrome:|^about:|^edge:|^moz-extension:|^chrome-extension:/.test(tab.url)) {
    $('noUrl').style.display = 'block';
    return;
  }

  const url = tab.url;
  const title = tab.title || '';
  const platform = detectPlatform(url);
  const cfg = PLATFORM_CONFIG[platform];

  // Show preview
  $('pagePreview').style.display = 'block';
  $('previewTitle').textContent = truncate(title, 80) || 'Untitled page';
  $('previewUrl').textContent = truncate(url, 60);

  // Platform badge
  const badge = $('platformBadge');
  badge.textContent = cfg.label;
  badge.style.color = cfg.color;
  badge.style.background = cfg.bg;
  badge.style.border = `1px solid ${cfg.color}33`;

  // Try to get OG image from the page (via scripting injection)
  try {
    const [{ result: ogImage }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const og = document.querySelector('meta[property="og:image"]');
        return og ? og.content : null;
      },
    });
    if (ogImage) {
      const thumb = $('previewThumb');
      thumb.src = ogImage;
      thumb.classList.remove('hidden');
      thumb.onerror = () => thumb.classList.add('hidden');
    }
  } catch {
    // scripting permission may not be available on all pages — that's fine
  }

  // Board section
  $('boardSection').style.display = 'block';
  loadBoards($('boardSelect'), baseUrl);

  // Show clip button
  $('clipBtn').style.display = 'flex';
  $('clipBtn').addEventListener('click', () => doClip(url, title, baseUrl));

  // Update header sub
  $('headerSub').textContent = 'Ready to clip';
}

// Load boards from TravelPanel (tries /api/boards; falls back to empty)
async function loadBoards(select, baseUrl) {
  if (!baseUrl) return;
  try {
    const res = await fetch(`${baseUrl}/api/boards`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const boards = await res.json();
    if (!Array.isArray(boards)) return;
    boards.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.emoji || '📁'} ${b.name}`;
      select.appendChild(opt);
    });
  } catch {
    // API endpoint doesn't exist yet — that's fine, use Inbox
  }
}

// Clip the current page
async function doClip(url, title, baseUrl) {
  const btn = $('clipBtn');
  btn.disabled = true;
  $('clipBtnLabel').textContent = 'Clipping…';
  hideStatus();

  if (!baseUrl) {
    showStatus('err',
      `<path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-7h-2V7h2v8zm0 4h-2v-2h2v2z"/>`,
      'Configure TravelPanel URL in settings first.'
    );
    btn.disabled = false;
    $('clipBtnLabel').textContent = 'Clip this page';
    return;
  }

  const selectedBoard = $('boardSelect').value;

  // Build the share URL (same flow as iOS Share Sheet)
  const shareUrl = new URL('/share', baseUrl);
  shareUrl.searchParams.set('url', url);
  if (title) shareUrl.searchParams.set('title', title);
  if (selectedBoard) shareUrl.searchParams.set('boardId', selectedBoard);

  // Open TravelPanel share page in a new tab
  chrome.tabs.create({ url: shareUrl.toString() });

  showStatus('ok',
    `<path d="M20 6L9 17l-5-5"/>`,
    'Opening TravelPanel — your clip is being saved!'
  );
  $('clipBtnLabel').textContent = 'Clipped!';

  // Persist recent clips locally
  await rememberRecentClip({ url, title, platform: detectPlatform(url), clippedAt: Date.now() });
}

async function rememberRecentClip(clip) {
  const { recentClips = [] } = await chrome.storage.local.get({ recentClips: [] });
  const deduped = recentClips.filter(c => c.url !== clip.url);
  await chrome.storage.local.set({ recentClips: [clip, ...deduped].slice(0, 20) });
}

init().catch(err => {
  console.error('TravelPanel Clipper error:', err);
  $('noUrl').style.display = 'block';
  $('noUrl').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    Something went wrong.<br><small style="color:#555">${err.message}</small>`;
});
