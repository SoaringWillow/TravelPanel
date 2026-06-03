const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

const PLATFORM_LABELS = {
  xiaohongshu: '📕 Xiaohongshu',
  wechat: '💬 WeChat',
  douyin: '🎵 Douyin / TikTok',
  bilibili: '🎬 Bilibili',
  instagram: '📸 Instagram',
  youtube: '▶️ YouTube',
  twitter: '🐦 Twitter / X',
};

function detectPlatform(url) {
  if (!url) return null;
  try {
    const h = new URL(url).hostname;
    if (h.includes('xiaohongshu') || h.includes('xhslink')) return 'xiaohongshu';
    if (h.includes('wechat') || h.includes('weixin')) return 'wechat';
    if (h.includes('douyin') || h.includes('tiktok')) return 'douyin';
    if (h.includes('bilibili')) return 'bilibili';
    if (h.includes('instagram')) return 'instagram';
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('twitter') || h.includes('x.com')) return 'twitter';
  } catch { /* ignore */ }
  return null;
}

function truncateUrl(url, max = 48) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function isBlockedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('moz-extension://')
  );
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (items) => {
      resolve(items.appUrl.replace(/\/$/, ''));
    });
  });
}

function openSharePage(url, title, appUrl, newTab = true) {
  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}`;
  if (newTab) {
    chrome.tabs.create({ url: shareUrl });
  } else {
    chrome.tabs.update({ url: shareUrl });
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const url = tab.url || '';
  const title = tab.title || '';
  const appUrl = await getAppUrl();

  // Elements
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const faviconEl = document.getElementById('favicon');
  const faviconFallback = document.getElementById('faviconFallback');
  const platformBadge = document.getElementById('platformBadge');
  const platformLabel = document.getElementById('platformLabel');
  const thumbnailWrap = document.getElementById('thumbnailWrap');
  const thumbnailEl = document.getElementById('thumbnail');
  const substanceHint = document.getElementById('substanceHint');
  const clipBtn = document.getElementById('clipBtn');
  const clipWithBoardBtn = document.getElementById('clipWithBoardBtn');
  const blockedNotice = document.getElementById('blockedNotice');
  const actionsDiv = document.querySelector('.actions');
  const successState = document.getElementById('successState');
  const footerEl = document.querySelector('.footer');

  // Blocked pages
  if (isBlockedUrl(url)) {
    blockedNotice.hidden = false;
    actionsDiv.hidden = true;
    pageTitleEl.textContent = 'Browser page';
    pageUrlEl.textContent = url;
    faviconEl.hidden = true;
    faviconFallback.style.display = 'flex';
    return;
  }

  // Page info
  pageTitleEl.textContent = title || 'Untitled page';
  pageUrlEl.textContent = truncateUrl(url);

  // Favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
  faviconEl.src = faviconUrl;
  faviconEl.onload = () => { faviconFallback.style.display = 'none'; };
  faviconEl.onerror = () => { faviconEl.hidden = true; };

  // Platform badge
  const platform = detectPlatform(url);
  if (platform && PLATFORM_LABELS[platform]) {
    platformLabel.textContent = PLATFORM_LABELS[platform];
    platformBadge.hidden = false;
  }

  // Try to get og:image via scripting (best-effort)
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const og = document.querySelector('meta[property="og:image"]');
        const desc = document.querySelector('meta[property="og:description"]') ||
                     document.querySelector('meta[name="description"]');
        return {
          image: og?.content || null,
          description: desc?.content || null,
        };
      },
    });

    if (result?.result?.image) {
      thumbnailEl.src = result.result.image;
      thumbnailEl.onload = () => {
        thumbnailWrap.hidden = false;
        // Hint about substance extraction
        if (platform === 'xiaohongshu' || platform === 'douyin' || platform === 'youtube') {
          substanceHint.textContent = 'Tips & wisdom will be extracted';
        } else {
          substanceHint.textContent = 'Spots & insights will be clipped';
        }
      };
    }
  } catch {
    // scripting unavailable on some pages — that's fine
  }

  // Clip button → open share page (Inbox)
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    openSharePage(url, title, appUrl);

    // Show brief success then close
    actionsDiv.hidden = true;
    successState.hidden = false;
    footerEl.hidden = true;
    setTimeout(() => window.close(), 1200);
  });

  // Clip with board → open share page (board picker visible by default)
  clipWithBoardBtn.addEventListener('click', () => {
    openSharePage(url, title, appUrl);
    setTimeout(() => window.close(), 400);
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
