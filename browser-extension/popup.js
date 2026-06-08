const PLATFORM_COLORS = {
  youtube:     '#FF0000',
  instagram:   '#E1306C',
  tiktok:      '#010101',
  xiaohongshu: '#FF2442',
  douyin:      '#1C1C1C',
  bilibili:    '#00A1D6',
  wechat:      '#07C160',
  other:       '#6B7280',
};

const PLATFORM_LABELS = {
  youtube:     'YouTube',
  instagram:   'Instagram',
  tiktok:      'TikTok',
  xiaohongshu: 'Xiaohongshu',
  douyin:      'Douyin',
  bilibili:    'Bilibili',
  wechat:      'WeChat',
  other:       'Web',
};

function detectPlatform(url) {
  if (/xiaohongshu\.com|xhslink\.com/i.test(url)) return 'xiaohongshu';
  if (/youtube\.com|youtu\.be/i.test(url))         return 'youtube';
  if (/instagram\.com/i.test(url))                 return 'instagram';
  if (/tiktok\.com/i.test(url))                    return 'tiktok';
  if (/douyin\.com/i.test(url))                    return 'douyin';
  if (/bilibili\.com/i.test(url))                  return 'bilibili';
  if (/weixin\.qq\.com|mp\.weixin/i.test(url))     return 'wechat';
  return 'other';
}

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => resolve(appUrl));
  });
}

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] ?? null);
    });
  });
}

async function init() {
  const [tab, appUrl] = await Promise.all([getCurrentTab(), getAppUrl()]);

  // ── Not configured ──────────────────────────────────────────────────────────
  if (!appUrl) {
    document.getElementById('pageInfo').style.display = 'none';
    document.getElementById('actionsSection').style.display = 'none';
    document.getElementById('notConfigured').style.display = 'block';
    document.getElementById('configBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // ── No active tab ────────────────────────────────────────────────────────────
  if (!tab?.url) {
    document.getElementById('pageTitle').textContent = 'No page detected';
    document.getElementById('saveBtn').disabled = true;
    return;
  }

  const { url, title = '' } = tab;
  const platform = detectPlatform(url);

  // Update platform chip
  const chip = document.getElementById('platformChip');
  chip.textContent = PLATFORM_LABELS[platform];
  chip.style.background = PLATFORM_COLORS[platform];

  // Update title and URL
  document.getElementById('pageTitle').textContent = title || 'Untitled';
  document.getElementById('pageUrl').textContent = url;

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', () => {
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Opening…</span>';

    const shareUrl =
      `${appUrl}/share` +
      `?url=${encodeURIComponent(url)}` +
      `&title=${encodeURIComponent(title)}` +
      `&source=extension`;

    chrome.tabs.create({ url: shareUrl });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
