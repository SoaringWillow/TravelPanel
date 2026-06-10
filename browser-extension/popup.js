// TravelPanel Clipper — Popup Script

const DEFAULT_TP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = {
  wechat:       { label: 'WeChat',    css: 'wechat' },
  xiaohongshu:  { label: 'RedBook',   css: 'xiaohongshu' },
  douyin:       { label: 'Douyin',    css: 'douyin' },
  bilibili:     { label: 'Bilibili',  css: 'bilibili' },
  instagram:    { label: 'Instagram', css: 'instagram' },
  youtube:      { label: 'YouTube',   css: 'youtube' },
  other:        { label: 'Web',       css: 'web' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (/weixin\.qq\.com|mp\.weixin/.test(url))                     return 'wechat';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/.test(url))        return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com|tiktok\.com/.test(url))         return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url))                          return 'bilibili';
  if (/instagram\.com/.test(url))                                  return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url))                         return 'youtube';
  return 'other';
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function getSettings() {
  return new Promise(resolve =>
    chrome.storage.sync.get({ travelPanelUrl: '', clipCount: 0 }, resolve)
  );
}

async function init() {
  const [tabs, settings] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    getSettings(),
  ]);

  const tab      = tabs[0];
  const pageUrl  = tab?.url || '';
  const pageTitle = tab?.title || pageUrl;

  const platform = detectPlatform(pageUrl);
  const conf     = PLATFORMS[platform] || PLATFORMS.other;

  // Platform badge
  const badge = document.getElementById('platform-badge');
  badge.textContent = conf.label;
  badge.className = `platform-badge ${conf.css}`;

  // Domain
  document.getElementById('page-domain').textContent = extractDomain(pageUrl);

  // Title & URL
  document.getElementById('page-title').textContent = pageTitle || 'Untitled page';
  document.getElementById('page-url').textContent   = pageUrl;

  // Clip count footer
  const count = settings.clipCount || 0;
  document.getElementById('clip-count-text').textContent =
    count === 0 ? 'Clip your first page →' :
    count === 1 ? '1 clip saved with TravelPanel' :
    `${count} clips saved with TravelPanel`;

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  const tpUrl     = settings.travelPanelUrl?.trim() || '';
  const clipBtn   = document.getElementById('clip-btn');
  const configNote = document.getElementById('config-notice');

  // If no URL configured, show warning and rewire button to settings
  if (!tpUrl) {
    configNote.style.display = 'flex';
    clipBtn.disabled = false;
    document.getElementById('btn-label').textContent = 'Set TravelPanel URL →';
    clipBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
    return;
  }

  // Normal clip flow
  clipBtn.disabled = false;
  clipBtn.addEventListener('click', () => clip(pageUrl, pageTitle, tpUrl, count));
}

async function clip(pageUrl, pageTitle, tpUrl, prevCount) {
  const base     = tpUrl || DEFAULT_TP_URL;
  const shareUrl = `${base}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

  // Show success state
  document.getElementById('page-card').style.display    = 'none';
  document.getElementById('config-notice').style.display = 'none';
  document.getElementById('actions').style.display      = 'none';
  const success = document.getElementById('success-state');
  success.style.display = 'flex';

  // Open TravelPanel share popup
  try {
    await chrome.windows.create({ url: shareUrl, type: 'popup', width: 440, height: 640, focused: true });
  } catch {
    await chrome.tabs.create({ url: shareUrl });
  }

  // Persist incremented count
  await chrome.storage.sync.set({ clipCount: prevCount + 1 });

  setTimeout(() => window.close(), 1400);
}

document.addEventListener('DOMContentLoaded', init);
