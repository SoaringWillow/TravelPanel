// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function showState(id) {
  document.querySelectorAll('.state').forEach((el) => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── Recent clips ─────────────────────────────────────────────────────────────

async function loadRecent() {
  const { recentClips = [] } = await chrome.storage.local.get({ recentClips: [] });
  const list = document.getElementById('recent-list');
  if (!recentClips.length) {
    document.getElementById('recent-section').style.display = 'none';
    return;
  }
  list.innerHTML = recentClips
    .slice(0, 3)
    .map(
      (c) => `
      <div class="recent-item">
        <span class="recent-title">${escapeHtml(c.title || getDomain(c.url))}</span>
        <span class="recent-time">${timeAgo(c.ts)}</span>
      </div>`
    )
    .join('');
}

async function saveRecent(url, title) {
  const { recentClips = [] } = await chrome.storage.local.get({ recentClips: [] });
  const entry = { url, title, ts: Date.now() };
  const updated = [entry, ...recentClips.filter((c) => c.url !== url)].slice(0, 10);
  await chrome.storage.local.set({ recentClips: updated });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab?.url || '';
  const pageTitle = tab?.title || '';

  // Get stored TravelPanel URL
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });

  // ── Setup state: no URL configured ────────────────────────────────────────
  if (!appUrl) {
    showState('state-setup');
    document.getElementById('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // ── Default state: show page info ─────────────────────────────────────────
  showState('state-default');

  const platform = detectPlatform(pageUrl);
  const platformColor = PLATFORM_COLORS[platform];
  const platformLabel = PLATFORM_LABELS[platform];

  // Favicon
  const faviconEl = document.getElementById('favicon');
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.onerror = () => { faviconEl.src = ''; faviconEl.style.display = 'none'; };
  } else {
    faviconEl.style.display = 'none';
  }

  // Page info
  document.getElementById('page-title').textContent = pageTitle || getDomain(pageUrl);
  document.getElementById('page-domain').textContent = getDomain(pageUrl);

  // Platform badge
  const badge = document.getElementById('platform-badge');
  badge.textContent = platformLabel;
  badge.style.backgroundColor = platformColor;

  // Recent clips
  await loadRecent();

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Clip button ────────────────────────────────────────────────────────────
  document.getElementById('clip-btn').addEventListener('click', async () => {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    // Show success state
    showState('state-success');
    document.getElementById('success-title').textContent = pageTitle || getDomain(pageUrl);
    document.getElementById('success-platform').textContent = platformLabel;
    document.getElementById('success-platform').style.backgroundColor = platformColor;

    // Save to recent
    await saveRecent(pageUrl, pageTitle);

    // Open TravelPanel share page
    chrome.tabs.create({ url: shareUrl });

    // Close popup after short delay
    setTimeout(() => window.close(), 1200);
  });
});
