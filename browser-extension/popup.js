'use strict';

// ── Platform detection ──────────────────────────────────────────────────────

const PLATFORMS = [
  { name: 'YouTube',     domains: ['youtube.com', 'youtu.be'],            color: '#EF4444' },
  { name: 'Instagram',   domains: ['instagram.com'],                      color: '#E1306C' },
  { name: 'TikTok',      domains: ['tiktok.com'],                        color: '#FF0050' },
  { name: 'X / Twitter', domains: ['twitter.com', 'x.com'],              color: '#1DA1F2' },
  { name: 'Xiaohongshu', domains: ['xiaohongshu.com', 'xhslink.com'],    color: '#FF2741' },
  { name: 'Douyin',      domains: ['douyin.com'],                        color: '#94a3b8' },
  { name: 'Bilibili',    domains: ['bilibili.com'],                      color: '#00A1D6' },
  { name: 'Pinterest',   domains: ['pinterest.com'],                     color: '#E60023' },
  { name: 'Reddit',      domains: ['reddit.com'],                        color: '#FF4500' },
  { name: 'Google Maps', domains: ['maps.google.com', 'goo.gl'],         color: '#4285F4' },
  { name: 'Tripadvisor', domains: ['tripadvisor.com'],                   color: '#34D399' },
];

// Map platform names to emoji (avoids issues with emoji in object literals)
const PLATFORM_EMOJI = {
  YouTube: '▶️', Instagram: '📸', TikTok: '🎵', 'X / Twitter': '🐦',
  Xiaohongshu: '📕', Douyin: '🎬', Bilibili: '📺', Pinterest: '📌',
  Reddit: '💬', 'Google Maps': '🗺️', Tripadvisor: '🦉',
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const match = PLATFORMS.find(p =>
      p.domains.some(d => host === d || host.endsWith('.' + d))
    );
    return match
      ? { ...match, emoji: PLATFORM_EMOJI[match.name] || '🌍' }
      : { name: 'Web', color: '#64748b', emoji: '🌐' };
  } catch {
    return { name: 'Web', color: '#64748b', emoji: '🌐' };
  }
}

// ── Storage helpers ─────────────────────────────────────────────────────────

const DEFAULT_APP_URL = 'https://travel-panel.vercel.app';

function getAppUrl() {
  return new Promise(resolve =>
    chrome.storage.sync.get(['appUrl'], r =>
      resolve((r.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''))
    )
  );
}

function setAppUrl(url) {
  return new Promise(resolve =>
    chrome.storage.sync.set({ appUrl: url.replace(/\/$/, '') }, resolve)
  );
}

// ── Page metadata extraction ────────────────────────────────────────────────

async function extractMeta(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const q = (sel) =>
          document.querySelector(sel)?.getAttribute('content') ?? null;
        return {
          url: location.href,
          title:
            q('meta[property="og:title"]') ||
            q('meta[name="og:title"]') ||
            document.title ||
            location.hostname,
          description:
            q('meta[property="og:description"]') ||
            q('meta[name="description"]') ||
            null,
          thumbnail:
            q('meta[property="og:image"]') ||
            q('meta[name="og:image"]') ||
            null,
          siteName:
            q('meta[property="og:site_name"]') || null,
        };
      },
    });
    return result;
  } catch {
    return null;
  }
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function showView(name) {
  document.querySelectorAll('[data-view]').forEach(v => {
    v.style.display = v.dataset.view === name ? '' : 'none';
  });
}

function clip(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Render preview ──────────────────────────────────────────────────────────

function renderPreview(meta) {
  const platform = detectPlatform(meta.url);

  // Thumbnail
  if (meta.thumbnail) {
    const img = $('thumbnail-img');
    img.src = meta.thumbnail;
    img.style.display = 'block';
    img.onload = () => { $('thumbnail-placeholder').style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; };
  }

  // Platform badge
  const badge = $('platform-badge');
  badge.textContent = `${platform.emoji} ${platform.name}`;
  badge.style.background = platform.color + '22';
  // Keep dark-theme readability for very dark platform colors
  badge.style.color =
    platform.name === 'Douyin' ? '#94a3b8' : platform.color;

  $('page-title').textContent = clip(meta.title, 72);
  $('page-url').textContent = clip(meta.url, 58);

  $('clip-btn').onclick = async () => {
    const appUrl = await getAppUrl();
    const dest = `${appUrl}/?import=${encodeURIComponent(meta.url)}`;
    await chrome.tabs.create({ url: dest });
    window.close();
  };

  showView('preview');
}

// ── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Settings panel wiring
  $('settings-btn').addEventListener('click', async () => {
    $('app-url-input').value = await getAppUrl();
    showView('settings');
  });

  $('cancel-settings').addEventListener('click', () => showView('preview'));

  $('save-settings').addEventListener('click', async () => {
    const val = $('app-url-input').value.trim();
    if (val) await setAppUrl(val);
    showView('preview');
  });

  // Allow Enter key in URL input to save
  $('app-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('save-settings').click();
  });

  $('close-error').addEventListener('click', () => window.close());

  // Load current tab
  showView('loading');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    $('error-msg').textContent = 'Could not access the current tab.';
    showView('error');
    return;
  }

  const meta = await extractMeta(tab.id);

  if (!meta || !meta.url) {
    // Fallback to basic tab info (works for chrome:// pages, new-tab, etc.)
    renderPreview({
      url: tab.url || '',
      title: tab.title || tab.url || 'Unknown page',
      description: null,
      thumbnail: null,
    });
    return;
  }

  renderPreview(meta);
});
