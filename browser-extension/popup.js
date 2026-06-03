'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORMS = {
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', emoji: '📸' },
  youtube:   { label: 'YouTube',   color: '#FF0000', bg: 'rgba(255,0,0,0.12)',     emoji: '▶️' },
  xiaohongshu: { label: '小红书', color: '#FF2442', bg: 'rgba(255,36,66,0.15)', emoji: '📕' },
  douyin:    { label: '抖音',       color: '#010101', bg: 'rgba(255,255,255,0.1)', emoji: '🎵' },
  bilibili:  { label: 'Bilibili',  color: '#00A1D6', bg: 'rgba(0,161,214,0.15)',  emoji: '📺' },
  tiktok:    { label: 'TikTok',    color: '#69C9D0', bg: 'rgba(105,201,208,0.15)',emoji: '🎵' },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2', bg: 'rgba(29,161,242,0.12)', emoji: '🐦' },
  other:     { label: 'Web',       color: '#6366f1', bg: 'rgba(99,102,241,0.12)', emoji: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('douyin.com')) return 'douyin';
  if (u.includes('bilibili.com')) return 'bilibili';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  return 'other';
}

async function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function showStatus(type, message) {
  const el = document.getElementById('status');
  el.className = `status ${type}`;
  el.textContent = message;
}

async function init() {
  const tab = await getCurrentTab();
  if (!tab) {
    document.getElementById('pageTitle').textContent = 'No active tab';
    document.getElementById('clipBtn').disabled = true;
    return;
  }

  const url   = tab.url   || '';
  const title = tab.title || url;

  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent   = url;

  const platform = detectPlatform(url);
  const info      = PLATFORMS[platform] || PLATFORMS.other;
  const badge     = document.getElementById('platformBadge');
  badge.style.display    = 'inline-flex';
  badge.style.background = info.bg;
  badge.style.color      = info.color;
  badge.textContent      = `${info.emoji} ${info.label}`;

  const appUrl = await getAppUrl();
  const footer = document.getElementById('footer');
  const domain = new URL(appUrl).hostname;
  footer.textContent = `Opens in ${domain}`;

  document.getElementById('clipBtn').addEventListener('click', async () => {
    const btn = document.getElementById('clipBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Opening TravelPanel…</span>';

    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    try {
      await chrome.tabs.create({ url: shareUrl, active: true });
      showStatus('success', '✓ Opened in TravelPanel — select a board to save!');
      setTimeout(() => window.close(), 1200);
    } catch (err) {
      showStatus('error', 'Failed to open TravelPanel. Check settings.');
      btn.disabled = false;
      btn.innerHTML = '<span>📌</span><span>Clip to TravelPanel</span>';
    }
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

init();
