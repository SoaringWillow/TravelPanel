const PLATFORMS = {
  xiaohongshu: {
    patterns: [/xiaohongshu\.com/, /xhslink\.com/, /xhs\.link/],
    label: '📕 Xiaohongshu',
    badge: 'badge-xhs',
  },
  youtube: {
    patterns: [/youtube\.com/, /youtu\.be/],
    label: '▶️ YouTube',
    badge: 'badge-youtube',
  },
  instagram: {
    patterns: [/instagram\.com/],
    label: '📸 Instagram',
    badge: 'badge-instagram',
  },
  douyin: {
    patterns: [/douyin\.com/, /iesdouyin\.com/],
    label: '🎵 Douyin',
    badge: 'badge-douyin',
  },
  wechat: {
    patterns: [/mp\.weixin\.qq\.com/],
    label: '💬 WeChat',
    badge: 'badge-wechat',
  },
  bilibili: {
    patterns: [/bilibili\.com/, /b23\.tv/],
    label: '📺 Bilibili',
    badge: 'badge-bilibili',
  },
};

function detectPlatform(url) {
  for (const [, val] of Object.entries(PLATFORMS)) {
    if (val.patterns.some((p) => p.test(url))) return val;
  }
  return { label: '🌐 Web', badge: 'badge-web' };
}

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || '');
    });
  });
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}

async function init() {
  const appUrl = await getAppUrl();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const mainContent = document.getElementById('main-content');
  const notConfigured = document.getElementById('not-configured');

  if (!appUrl) {
    mainContent.style.display = 'none';
    notConfigured.style.display = 'block';
    document.getElementById('btn-configure').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  const openAppLink = document.getElementById('open-app');
  openAppLink.href = appUrl;
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
    window.close();
  });

  const pageUrl = tab.url || '';
  const pageTitle = tab.title || 'Untitled';

  document.getElementById('page-title').textContent = pageTitle;
  document.getElementById('page-url').textContent = pageUrl;

  const platform = detectPlatform(pageUrl);
  const badge = document.getElementById('platform-badge');
  badge.textContent = platform.label;
  badge.className = `platform-badge ${platform.badge}`;
  badge.style.display = 'inline-flex';

  document.getElementById('btn-save').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Opening TravelPanel…';

    try {
      const shareUrl =
        `${appUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;
      chrome.tabs.create({ url: shareUrl, active: true });

      document.getElementById('main-content').style.display = 'none';
      document.getElementById('success-state').style.display = 'block';
      setTimeout(() => window.close(), 1800);
    } catch {
      showError('Could not open TravelPanel. Check the URL in settings.');
      btn.disabled = false;
      btn.innerHTML = '<span>📌</span> Save to TravelPanel';
    }
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

init().catch((err) => {
  document.getElementById('page-title').textContent = 'Error loading page info';
  console.error(err);
});
