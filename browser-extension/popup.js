'use strict';

const DEFAULT_APP_URL = '';

const PLATFORM_LABELS = {
  wechat:       'WeChat',
  xiaohongshu:  'Xiaohongshu',
  douyin:       'Douyin',
  bilibili:     'Bilibili',
  youtube:      'YouTube',
  instagram:    'Instagram',
  other:        null,
};

function detectPlatform(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('douyin.com') || u.includes('iesdouyin.com'))   return 'douyin';
  if (u.includes('bilibili.com'))  return 'bilibili';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('weixin.qq.com') || u.includes('mp.weixin')) return 'wechat';
  return 'other';
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.length > 24 ? u.pathname.slice(0, 22) + '…' : u.pathname;
    return host + path;
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? '…' : '');
  }
}

function init() {
  chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
    const resolvedUrl = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      renderPageCard(tab);

      if (!resolvedUrl) {
        showWarning();
        return;
      }

      enableClipButton(tab, resolvedUrl);
    });
  });

  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function renderPageCard(tab) {
  const titleEl   = document.getElementById('pageTitle');
  const urlEl     = document.getElementById('pageUrl');
  const faviconEl = document.getElementById('pageFavicon');
  const fallback  = document.getElementById('pageFaviconFallback');
  const badge     = document.getElementById('platformBadge');
  const label     = document.getElementById('platformLabel');

  titleEl.textContent = tab.title || 'Untitled page';
  urlEl.textContent   = truncateUrl(tab.url || '');

  if (tab.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.onload  = () => { fallback.style.display = 'none'; };
    faviconEl.onerror = () => { faviconEl.style.display = 'none'; fallback.style.display = ''; };
  } else {
    faviconEl.style.display = 'none';
  }

  const platform = detectPlatform(tab.url);
  const platformLabel = PLATFORM_LABELS[platform];
  if (platformLabel) {
    label.textContent   = platformLabel;
    badge.style.display = 'inline-flex';
  }
}

function showWarning() {
  document.getElementById('warningBar').style.display = 'flex';
  document.getElementById('configureLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function enableClipButton(tab, appUrl) {
  const btn = document.getElementById('clipBtn');
  btn.disabled = false;

  btn.addEventListener('click', () => {
    const shareUrl =
      appUrl +
      '/share?url=' + encodeURIComponent(tab.url || '') +
      '&title=' + encodeURIComponent(tab.title || '');

    showSuccess();
    chrome.tabs.create({ url: shareUrl });
    setTimeout(() => window.close(), 800);
  });
}

function showSuccess() {
  document.getElementById('viewMain').style.display = 'none';
  document.getElementById('viewSuccess').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
